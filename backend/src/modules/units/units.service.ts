import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import { CreateUnitInput } from './dto/create-unit.input.js';
import { UpdateUnitInput } from './dto/update-unit.input.js';
import { UnitFilterArgs } from './dto/unit-filter.args.js';
import { AssignTransportManagerInput } from './dto/assign-transport-manager.input.js';
import { CloseTransportManagerAssignmentInput } from './dto/close-transport-manager-assignment.input.js';

/**
 * Único lugar con decisiones sobre unidades y designaciones de encargado
 * (spec 002). El encargado vigente nunca se guarda como campo mutable de la
 * unidad: siempre se deriva de TransportManagerAssignment (RF-25).
 */
@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: UnitFilterArgs) {
    const where: Prisma.UnitWhereInput = {
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.parentId ? { parentId: filters.parentId } : {}),
      ...(filters.search
        ? {
            OR: [
              { code: { contains: filters.search, mode: 'insensitive' } },
              { name: { contains: filters.search, mode: 'insensitive' } },
              { location: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { name: 'asc' },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException(`Unidad ${id} no encontrada`);
    }
    return unit;
  }

  /// RF-11: sub-unidades directas de una unidad.
  findChildren(parentId: string) {
    return this.prisma.unit.findMany({
      where: { parentId },
      orderBy: { name: 'asc' },
    });
  }

  async create(input: CreateUnitInput) {
    return withUniqueConstraintHandling(
      () =>
        this.prisma.unit.create({
          data: {
            ...input,
            code: input.code ? this.normalizeCode(input.code) : undefined,
          },
        }),
      'Ya existe una unidad con ese',
    );
  }

  async update(id: string, input: UpdateUnitInput) {
    await this.findOne(id);
    if (input.parentId) {
      await this.assertNoParentCycle(id, input.parentId);
    }
    return withUniqueConstraintHandling(
      () =>
        this.prisma.unit.update({
          where: { id },
          data: {
            ...input,
            ...(input.code ? { code: this.normalizeCode(input.code) } : {}),
          },
        }),
      'Ya existe una unidad con ese',
    );
  }

  /// RF-06/RF-07: rechaza si tiene sub-unidades activas; si no, marca
  /// inactiva y cierra la designación de encargado vigente (si la tiene).
  /// También rechaza si tiene vehículos con asignación vigente (spec 003,
  /// RF-17) — se consulta `unit_assignment` con Prisma directo, no
  /// UnitAssignmentsService, para que units no dependa de unit-assignments.
  async deactivate(id: string) {
    await this.findOne(id);
    const activeChildren = await this.prisma.unit.findMany({
      where: { parentId: id, isActive: true },
      select: { name: true },
    });
    if (activeChildren.length > 0) {
      const names = activeChildren.map((child) => child.name).join(', ');
      throw new ConflictException(
        `No se puede dar de baja: tiene sub-unidades activas (${names})`,
      );
    }

    const activeVehicles = await this.prisma.unitAssignment.count({
      where: { unitId: id, endDate: null },
    });
    if (activeVehicles > 0) {
      throw new ConflictException(
        `No se puede dar de baja: tiene ${activeVehicles} vehículo(s) con asignación vigente`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.transportManagerAssignment.updateMany({
        where: { unitId: id, endDate: null },
        data: { endDate: new Date() },
      });
      return tx.unit.update({ where: { id }, data: { isActive: false } });
    });
  }

  /// RF-08/RF-09: no restaura ningún encargado; rechaza si la unidad
  /// superior sigue inactiva.
  async reactivate(id: string) {
    const unit = await this.findOne(id);
    if (unit.parentId) {
      const parent = await this.prisma.unit.findUnique({
        where: { id: unit.parentId },
      });
      if (parent && !parent.isActive) {
        throw new ConflictException(
          'No se puede reactivar: la unidad superior está inactiva',
        );
      }
    }
    return this.prisma.unit.update({ where: { id }, data: { isActive: true } });
  }

  /// RF-25: "Sin encargado" cuando no hay designación vigente.
  getCurrentManager(unitId: string) {
    return this.prisma.transportManagerAssignment.findFirst({
      where: { unitId, endDate: null },
    });
  }

  getManagerHistory(unitId: string) {
    return this.prisma.transportManagerAssignment.findMany({
      where: { unitId },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });
  }

  /// RF-19/RF-20/RF-21/RF-22: designa un encargado, cerrando la vigente si
  /// la hay, dentro de una transacción.
  async assignTransportManager(input: AssignTransportManagerInput) {
    const unit = await this.findOne(input.unitId);
    if (!unit.isActive) {
      throw new ConflictException('La unidad está inactiva');
    }

    const officer = await this.prisma.officer.findUnique({
      where: { id: input.officerId },
    });
    if (!officer) {
      throw new NotFoundException(`Personal ${input.officerId} no encontrado`);
    }
    if (!officer.isActive) {
      throw new ConflictException('El personal está inactivo');
    }

    const startDate = new Date(input.startDate);
    if (startDate > new Date()) {
      throw new ConflictException('La fecha de inicio no puede ser futura');
    }

    const current = await this.getCurrentManager(input.unitId);
    if (current && startDate < current.startDate) {
      throw new ConflictException(
        'La fecha de inicio no puede ser anterior a la designación vigente',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.transportManagerAssignment.update({
          where: { id: current.id },
          data: { endDate: startDate },
        });
      }
      return tx.transportManagerAssignment.create({
        data: {
          unitId: input.unitId,
          officerId: input.officerId,
          startDate,
          referenceDocument: input.referenceDocument,
          notes: input.notes,
        },
      });
    });
  }

  /// RF-23/RF-24.
  async closeTransportManagerAssignment(
    input: CloseTransportManagerAssignmentInput,
  ) {
    const current = await this.getCurrentManager(input.unitId);
    if (!current) {
      throw new NotFoundException(
        'La unidad no tiene una designación de encargado vigente',
      );
    }
    const endDate = new Date(input.endDate);
    if (endDate < current.startDate) {
      throw new ConflictException(
        'La fecha de fin no puede ser anterior al inicio de la designación',
      );
    }
    return this.prisma.transportManagerAssignment.update({
      where: { id: current.id },
      data: { endDate },
    });
  }

  /// RF-12 + caso límite: mayúsculas, sin espacios ni guiones, para que
  /// "epi-3", "EPI 3 " y "Epi-3" no cuelen como códigos distintos.
  private normalizeCode(code: string): string {
    return code.toUpperCase().replace(/[\s-]+/g, '');
  }

  /// RF-05: rechaza si `newParentId` es la propia unidad o alguna de sus
  /// descendientes (el ciclo puede ser indirecto y a varios niveles).
  private async assertNoParentCycle(unitId: string, newParentId: string) {
    if (newParentId === unitId) {
      throw new ConflictException('Una unidad no puede depender de sí misma');
    }
    let current = await this.prisma.unit.findUnique({
      where: { id: newParentId },
    });
    const visited = new Set<string>();
    while (current?.parentId) {
      if (current.parentId === unitId) {
        throw new ConflictException(
          'La jerarquía quedaría en ciclo: esa unidad ya depende de la que se quiere mover',
        );
      }
      if (visited.has(current.parentId)) {
        break;
      }
      visited.add(current.parentId);
      current = await this.prisma.unit.findUnique({
        where: { id: current.parentId },
      });
    }
  }
}
