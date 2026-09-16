import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateMaintenanceOrderInput } from './dto/create-maintenance-order.input.js';
import { FinishMaintenanceOrderInput } from './dto/finish-maintenance-order.input.js';
import { MaintenanceOrderFilterArgs } from './dto/maintenance-order-filter.args.js';

type MaintenanceOrderRow = {
  laborCost: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  [key: string]: unknown;
};

/**
 * Órdenes de mantenimiento (spec 008). No usa `MaintenanceItem` (depende de
 * `SparePart`, que no existe como módulo todavía): el costo viaja como un
 * único campo `totalCost` fijado al finalizar la orden, `laborCost` queda
 * en 0.
 */
@Injectable()
export class MaintenanceOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: MaintenanceOrderFilterArgs) {
    const where: Prisma.MaintenanceOrderWhereInput = {
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                vehicle: {
                  plate: { contains: filters.search, mode: 'insensitive' },
                },
              },
              {
                workshopName: { contains: filters.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenanceOrder.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.maintenanceOrder.count({ where }),
    ]);

    return { items: items.map((item) => this.serialize(item)), total };
  }

  async findOne(id: string) {
    const order = await this.prisma.maintenanceOrder.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`Orden de mantenimiento ${id} no encontrada`);
    }
    return this.serialize(order);
  }

  getVehicle(vehicleId: string) {
    return this.prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  }

  /// RF-1 a RF-3.
  async create(
    input: CreateMaintenanceOrderInput,
    actingUser: AuthenticatedUser,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }

    const actingUserId = actingUser.id;

    const created = await this.prisma.maintenanceOrder.create({
      data: {
        code: this.generateCode(),
        type: input.type,
        status: 'IN_PROGRESS',
        description: input.description,
        workshopName: input.workshopName,
        odometer: input.odometer,
        startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
        invoiceNumber: input.invoiceNumber,
        vehicleId: input.vehicleId,
        registeredById: actingUserId,
      },
    });
    return this.serialize(created);
  }

  /// RF-4/RF-5.
  async finish(id: string, input: FinishMaintenanceOrderInput) {
    const order = await this.prisma.maintenanceOrder.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`Orden de mantenimiento ${id} no encontrada`);
    }
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new ConflictException('La orden ya está cerrada');
    }

    const finished = await this.prisma.maintenanceOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        finishedAt: input.finishedAt ? new Date(input.finishedAt) : new Date(),
        totalCost: input.totalCost,
        invoiceNumber: input.invoiceNumber ?? order.invoiceNumber,
      },
    });
    return this.serialize(finished);
  }

  private generateCode(): string {
    return `MNT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  private serialize(
    order: MaintenanceOrderRow,
  ): Omit<MaintenanceOrderRow, 'totalCost'> & { totalCost: number } {
    return {
      ...order,
      totalCost: Number(order.totalCost),
    };
  }
}
