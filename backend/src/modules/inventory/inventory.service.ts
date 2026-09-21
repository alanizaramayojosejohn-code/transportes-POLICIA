import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateSparePartInput } from './dto/create-spare-part.input.js';
import { UpdateSparePartInput } from './dto/update-spare-part.input.js';
import { SparePartFilterArgs } from './dto/spare-part-filter.args.js';
import { CreateStockMovementInput } from './dto/create-stock-movement.input.js';

type DecimalRow = Record<string, unknown> & {
  minStock?: Prisma.Decimal;
  currentStock?: Prisma.Decimal;
  lastUnitCost?: Prisma.Decimal | null;
  weight?: Prisma.Decimal | null;
  quantity?: Prisma.Decimal;
  unitCost?: Prisma.Decimal | null;
  balanceAfter?: Prisma.Decimal;
};

/**
 * Catálogo de repuestos y movimientos de inventario (spec 009).
 * `SparePart.currentStock` sólo se escribe aquí, dentro de la misma
 * transacción que inserta el `StockMovement` que lo motiva.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.sparePartCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findAll(filters: SparePartFilterArgs) {
    const where: Prisma.SparePartWhereInput = {
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { code: { contains: filters.search, mode: 'insensitive' } },
              { name: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sparePart.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { name: 'asc' },
      }),
      this.prisma.sparePart.count({ where }),
    ]);

    return { items: items.map((item) => this.serialize(item)), total };
  }

  async findOne(id: string) {
    const part = await this.prisma.sparePart.findUnique({ where: { id } });
    if (!part) {
      throw new NotFoundException(`Artículo ${id} no encontrado`);
    }
    return this.serialize(part);
  }

  getCategory(categoryId: string | null) {
    if (!categoryId) {
      return null;
    }
    return this.prisma.sparePartCategory.findUnique({
      where: { id: categoryId },
    });
  }

  /// RF-1 a RF-3.
  async create(input: CreateSparePartInput) {
    await this.findCategoryOrThrow(input.categoryId);

    return withUniqueConstraintHandling(async () => {
      const created = await this.prisma.sparePart.create({
        data: {
          code: input.code,
          name: input.name,
          categoryId: input.categoryId,
          type: input.type,
          tireSize: input.tireSize,
          weight: input.weight,
          unit: input.unit,
          minStock: input.minStock ?? 0,
          location: input.location,
          description: input.description,
        },
      });
      return this.serialize(created);
    }, 'Ya existe un artículo con ese');
  }

  /// RF-4.
  async update(id: string, input: UpdateSparePartInput) {
    await this.findOne(id);
    if (input.categoryId) {
      await this.findCategoryOrThrow(input.categoryId);
    }

    return withUniqueConstraintHandling(async () => {
      const updated = await this.prisma.sparePart.update({
        where: { id },
        data: input,
      });
      return this.serialize(updated);
    }, 'Ya existe un artículo con ese');
  }

  /// RF-5.
  async deactivate(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.sparePart.update({
      where: { id },
      data: { isActive: false },
    });
    return this.serialize(updated);
  }

  async reactivate(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.sparePart.update({
      where: { id },
      data: { isActive: true },
    });
    return this.serialize(updated);
  }

  /// RF-6 a RF-9.
  async registerMovement(
    input: CreateStockMovementInput,
    actingUser: AuthenticatedUser,
  ) {
    if (input.type !== 'IN' && input.type !== 'OUT') {
      throw new BadRequestException(
        'Sólo se admiten movimientos de entrada o salida',
      );
    }

    const part = await this.prisma.sparePart.findUnique({
      where: { id: input.sparePartId },
    });
    if (!part) {
      throw new NotFoundException(
        `Artículo ${input.sparePartId} no encontrado`,
      );
    }
    if (!part.isActive) {
      throw new ConflictException('El artículo está inactivo');
    }

    const currentStock = Number(part.currentStock);
    if (input.type === 'OUT' && input.quantity > currentStock) {
      throw new ConflictException(
        `Stock insuficiente: disponible ${currentStock} ${part.unit}`,
      );
    }

    const newStock =
      input.type === 'IN'
        ? currentStock + input.quantity
        : currentStock - input.quantity;
    const actingUserId = actingUser.id;

    /// Spec 017 RF-5/RF-8: el lote sólo aplica a una entrada, el vehículo
    /// destino sólo a una salida; el otro lado se ignora si se envía.
    if (input.type === 'OUT' && input.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: input.vehicleId },
      });
      if (!vehicle) {
        throw new NotFoundException(
          `Vehículo ${input.vehicleId} no encontrado`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          sparePartId: input.sparePartId,
          type: input.type,
          quantity: input.quantity,
          unitCost: input.unitCost,
          balanceAfter: newStock,
          reason: input.reason,
          supplier: input.supplier,
          reference: input.reference,
          registeredById: actingUserId,
          ...(input.type === 'IN'
            ? {
                lotNumber: input.lotNumber,
                lotExpiresAt: input.lotExpiresAt
                  ? new Date(input.lotExpiresAt)
                  : undefined,
              }
            : {}),
          ...(input.type === 'OUT' ? { vehicleId: input.vehicleId } : {}),
        },
      });
      await tx.sparePart.update({
        where: { id: input.sparePartId },
        data: {
          currentStock: newStock,
          ...(input.type === 'IN' && input.unitCost !== undefined
            ? { lastUnitCost: input.unitCost }
            : {}),
        },
      });
      return this.serialize(movement);
    });
  }

  private async findCategoryOrThrow(categoryId: string) {
    const category = await this.prisma.sparePartCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Categoría ${categoryId} no encontrada`);
    }
    return category;
  }

  private serialize<T extends DecimalRow>(row: T): T {
    return {
      ...row,
      ...(row.minStock !== undefined ? { minStock: Number(row.minStock) } : {}),
      ...(row.currentStock !== undefined
        ? { currentStock: Number(row.currentStock) }
        : {}),
      ...(row.lastUnitCost !== undefined
        ? {
            lastUnitCost:
              row.lastUnitCost === null ? null : Number(row.lastUnitCost),
          }
        : {}),
      ...(row.weight !== undefined
        ? { weight: row.weight === null ? null : Number(row.weight) }
        : {}),
      ...(row.quantity !== undefined ? { quantity: Number(row.quantity) } : {}),
      ...(row.unitCost !== undefined
        ? { unitCost: row.unitCost === null ? null : Number(row.unitCost) }
        : {}),
      ...(row.balanceAfter !== undefined
        ? { balanceAfter: Number(row.balanceAfter) }
        : {}),
    };
  }
}
