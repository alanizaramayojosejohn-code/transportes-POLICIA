import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import { CreateProcedureTypeInput } from './dto/create-procedure-type.input.js';
import { UpdateProcedureTypeInput } from './dto/update-procedure-type.input.js';
import { ProcedureTypeFilterArgs } from './dto/procedure-type-filter.args.js';
import { UpdateProcedureChecklistItemInput } from './dto/update-procedure-checklist-item.input.js';

export type ChecklistParentField =
  'vehicleId' | 'fuelRecordId' | 'stockMovementId' | 'maintenanceOrderId';

/**
 * Catálogo de tipos de trámite (spec 016, RF-1 a RF-8/RF-18) y operaciones
 * de checklist sobre un registro ya guardado (RF-15 a RF-17). El alta del
 * checklist junto con el registro de la acción no vive aquí: la hace
 * `saveChecklistItems` (`checklist.helpers.ts`) dentro de la transacción de
 * cada uno de los cuatro módulos dueños de esa acción.
 */
@Injectable()
export class ProceduresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllTypes(filters: ProcedureTypeFilterArgs) {
    const where: Prisma.ProcedureTypeWhereInput = {
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.procedureType.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { name: 'asc' },
      }),
      this.prisma.procedureType.count({ where }),
    ]);

    return { items, total };
  }

  async findOneType(id: string) {
    const type = await this.prisma.procedureType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException(`Tipo de trámite ${id} no encontrado`);
    }
    return type;
  }

  getType(procedureTypeId: string) {
    return this.prisma.procedureType.findUniqueOrThrow({
      where: { id: procedureTypeId },
    });
  }

  /// RF-1 a RF-3/RF-6: nombre único por acción.
  async createType(input: CreateProcedureTypeInput) {
    return withUniqueConstraintHandling(
      () =>
        this.prisma.procedureType.create({
          data: {
            name: input.name,
            description: input.description,
            action: input.action,
          },
        }),
      'Ya existe un tipo de trámite con ese',
    );
  }

  /// RF-4: no admite cambiar la acción, fija desde la creación.
  async updateType(id: string, input: UpdateProcedureTypeInput) {
    await this.findOneType(id);
    return withUniqueConstraintHandling(
      () =>
        this.prisma.procedureType.update({
          where: { id },
          data: { name: input.name, description: input.description },
        }),
      'Ya existe un tipo de trámite con ese',
    );
  }

  /// RF-5.
  async deactivateType(id: string) {
    await this.findOneType(id);
    return this.prisma.procedureType.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reactivateType(id: string) {
    await this.findOneType(id);
    return this.prisma.procedureType.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /// RF-7/RF-8: elimina definitivamente sólo si nunca se usó en un checklist.
  async removeType(id: string): Promise<boolean> {
    await this.findOneType(id);
    const inUse = await this.prisma.procedureChecklistItem.count({
      where: { procedureTypeId: id },
    });
    if (inUse > 0) {
      throw new ConflictException(
        'El tipo de trámite ya tiene ítems de checklist asociados; desactívelo en vez de eliminarlo',
      );
    }
    await this.prisma.procedureType.delete({ where: { id } });
    return true;
  }

  /// RF-17.
  listItems(parentField: ChecklistParentField, parentId: string) {
    return this.prisma.procedureChecklistItem.findMany({
      where: { [parentField]: parentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /// RF-15/RF-16: sólo actualiza ítems ya existentes del mismo registro
  /// (`parentId` acota el `WHERE`, así un id ajeno no cuela); no agrega ni
  /// quita ítems.
  async updateItems(
    parentField: ChecklistParentField,
    parentId: string,
    items: UpdateProcedureChecklistItemInput[],
  ) {
    if (items.length === 0) {
      return this.listItems(parentField, parentId);
    }

    const ids = items.map((item) => item.id);
    const existing = await this.prisma.procedureChecklistItem.findMany({
      where: { id: { in: ids }, [parentField]: parentId },
      select: { id: true },
    });
    if (existing.length !== new Set(ids).size) {
      throw new NotFoundException(
        'Uno o más ítems del checklist no pertenecen a este registro',
      );
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.procedureChecklistItem.update({
          where: { id: item.id },
          data: { completed: item.completed, documentCode: item.documentCode },
        }),
      ),
    );

    return this.listItems(parentField, parentId);
  }
}
