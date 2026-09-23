import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { assertInScope, type UnitScope } from '../../common/unit-scope.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { UnitsService } from '../units/units.service.js';
import { CreateUnitAssignmentInput } from './dto/create-unit-assignment.input.js';
import { CloseUnitAssignmentInput } from './dto/close-unit-assignment.input.js';
import { UpdateUnitAssignmentNotesInput } from './dto/update-unit-assignment-notes.input.js';
import { UnitAssignmentFilterArgs } from './dto/unit-assignment-filter.args.js';

/**
 * Único lugar con decisiones sobre asignaciones de vehículo a unidad (spec
 * 003). Depende de vehicles y units (dirección de dependencia: éste módulo
 * hacia esos dos, nunca al revés); los ganchos inversos (RF-16 al dar de
 * baja un vehículo, RF-17 al dar de baja una unidad) viven en esos otros
 * servicios usando Prisma directamente, para no crear un ciclo de módulos.
 */
@Injectable()
export class UnitAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
    private readonly unitsService: UnitsService,
  ) {}

  async findAll(filters: UnitAssignmentFilterArgs, scope: UnitScope = null) {
    /// Alcance por unidad (spec 015, RF-12): ambos filtros pesan sobre
    /// `unitId`, así que se combinan con `AND` en vez de dos entradas del
    /// spread (que se pisarían entre sí).
    const unitIdConditions: Prisma.UnitAssignmentWhereInput[] = [
      ...(filters.unitId ? [{ unitId: filters.unitId }] : []),
      ...(scope !== null ? [{ unitId: { in: scope } }] : []),
    ];

    const where: Prisma.UnitAssignmentWhereInput = {
      ...(unitIdConditions.length > 0 ? { AND: unitIdConditions } : {}),
      ...(filters.current !== undefined
        ? { endDate: filters.current ? null : { not: null } }
        : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            startDate: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              {
                referenceDocument: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                vehicle: {
                  plate: { contains: filters.search, mode: 'insensitive' },
                },
              },
              {
                unit: {
                  name: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.unitAssignment.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.unitAssignment.count({ where }),
    ]);

    return { items, total };
  }

  /// RF-13/RF-14: "Sin unidad asignada" cuando no hay ninguna vigente.
  getCurrentForVehicle(vehicleId: string) {
    return this.prisma.unitAssignment.findFirst({
      where: { vehicleId, endDate: null },
    });
  }

  getHistoryForVehicle(vehicleId: string) {
    return this.prisma.unitAssignment.findMany({
      where: { vehicleId },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });
  }

  /// RF-15: vehículos con asignación vigente en una unidad.
  countActiveForUnit(unitId: string) {
    return this.prisma.unitAssignment.count({
      where: { unitId, endDate: null },
    });
  }

  /// RF-01 a RF-07: crea la asignación, cerrando la vigente si la hay.
  async create(input: CreateUnitAssignmentInput, scope: UnitScope = null) {
    const vehicle = await this.vehiclesService.findOne(input.vehicleId);
    if (!vehicle.isActive) {
      throw new ConflictException('El vehículo está inactivo');
    }

    const unit = await this.unitsService.findOne(input.unitId);
    if (!unit.isActive) {
      throw new ConflictException('La unidad está inactiva');
    }
    /// RF-14 (spec 015): un TRANSPORTES sólo asigna vehículos a alguna de
    /// sus propias unidades — nunca a una ajena. No exige que la unidad
    /// *anterior* del vehículo también esté en el alcance: así puede tomar
    /// uno recién creado y todavía sin ninguna asignación.
    assertInScope(scope, input.unitId);

    const startDate = new Date(input.startDate);
    if (startDate > new Date()) {
      throw new ConflictException('La fecha de inicio no puede ser futura');
    }

    const current = await this.getCurrentForVehicle(input.vehicleId);
    if (current) {
      if (current.unitId === input.unitId) {
        throw new ConflictException(
          `El vehículo ya está asignado a esa unidad desde ${current.startDate.toISOString().slice(0, 10)}`,
        );
      }
      if (startDate < current.startDate) {
        throw new ConflictException(
          'La fecha de inicio no puede ser anterior a la asignación vigente',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.unitAssignment.update({
          where: { id: current.id },
          data: { endDate: startDate },
        });
      }
      return tx.unitAssignment.create({
        data: {
          vehicleId: input.vehicleId,
          unitId: input.unitId,
          startDate,
          reason: input.reason,
          referenceDocument: input.referenceDocument,
          notes: input.notes,
        },
      });
    });
  }

  /// RF-08/RF-09.
  async close(input: CloseUnitAssignmentInput, scope: UnitScope = null) {
    const current = await this.getCurrentForVehicle(input.vehicleId);
    if (!current) {
      throw new NotFoundException(
        'El vehículo no tiene una asignación de unidad vigente',
      );
    }
    /// RF-14: sólo sobre vehículos cuya unidad actual está en el alcance.
    assertInScope(scope, current.unitId);
    const endDate = new Date(input.endDate);
    if (endDate < current.startDate) {
      throw new ConflictException(
        'La fecha de fin no puede ser anterior al inicio de la asignación',
      );
    }
    if (endDate > new Date()) {
      throw new ConflictException(
        'La fecha de fin no puede ser posterior a hoy',
      );
    }
    return this.prisma.unitAssignment.update({
      where: { id: current.id },
      data: { endDate },
    });
  }

  /// RF-10: única edición permitida sobre la vigente.
  async updateNotes(
    input: UpdateUnitAssignmentNotesInput,
    scope: UnitScope = null,
  ) {
    const current = await this.getCurrentForVehicle(input.vehicleId);
    if (!current) {
      throw new NotFoundException(
        'El vehículo no tiene una asignación de unidad vigente',
      );
    }
    /// RF-14: mismo criterio que `close`.
    assertInScope(scope, current.unitId);
    return this.prisma.unitAssignment.update({
      where: { id: current.id },
      data: {
        reason: input.reason,
        referenceDocument: input.referenceDocument,
        notes: input.notes,
      },
    });
  }
}
