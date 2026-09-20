import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service.js';
import { CreateFuelRecordInput } from './dto/create-fuel-record.input.js';
import { FuelRecordFilterArgs } from './dto/fuel-record-filter.args.js';

type FuelRecordRow = {
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  efficiencyKmPerUnit: Prisma.Decimal | null;
  [key: string]: unknown;
};

/**
 * Abastecimientos de combustible (spec 007). `totalCost` y
 * `efficiencyKmPerUnit` no son entrada del usuario: los calcula este
 * servicio (RF-5), nunca se aceptan del cliente.
 */
@Injectable()
export class FuelRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
  ) {}

  async findAll(filters: FuelRecordFilterArgs) {
    const where: Prisma.FuelRecordWhereInput = {
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.fuelType ? { fuelType: filters.fuelType } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            suppliedAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              {
                vehicle: {
                  plate: { contains: filters.search, mode: 'insensitive' },
                },
              },
              { station: { contains: filters.search, mode: 'insensitive' } },
              {
                ticketNumber: { contains: filters.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fuelRecord.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { suppliedAt: 'desc' },
      }),
      this.prisma.fuelRecord.count({ where }),
    ]);

    return { items: items.map((item) => this.serialize(item)), total };
  }

  async findOne(id: string) {
    const record = await this.prisma.fuelRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Abastecimiento ${id} no encontrado`);
    }
    return this.serialize(record);
  }

  getVehicle(vehicleId: string) {
    return this.prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  }

  getDriver(driverId: string | null) {
    if (!driverId) {
      return null;
    }
    return this.prisma.personnel.findUnique({ where: { id: driverId } });
  }

  /// RF-1 a RF-5. RF-13/RF-14 (spec 014): un CONDUCTOR sólo carga
  /// combustible del vehículo del que es encargado vigente, y siempre a su
  /// propio nombre.
  async create(input: CreateFuelRecordInput, actingUser: AuthenticatedUser) {
    if (actingUser.role === 'CONDUCTOR') {
      await this.vehicleDriverAssignmentsService.assertDriverOwnsVehicle(
        actingUser.personnelId,
        input.vehicleId,
      );
      input = { ...input, driverId: actingUser.personnelId! };
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }
    if (input.driverId) {
      const driver = await this.prisma.personnel.findUnique({
        where: { id: input.driverId },
      });
      if (!driver) {
        throw new NotFoundException(
          `Conductor ${input.driverId} no encontrado`,
        );
      }
    }

    const last = await this.prisma.fuelRecord.findFirst({
      where: { vehicleId: input.vehicleId },
      orderBy: { suppliedAt: 'desc' },
    });
    if (last && input.odometer < last.odometer) {
      throw new ConflictException(
        'El kilometraje no puede ser menor al de la última carga registrada',
      );
    }

    const actingUserId = actingUser.id;
    const totalCost = input.quantity * input.unitPrice;
    const efficiencyKmPerUnit = last
      ? (input.odometer - last.odometer) / input.quantity
      : null;

    const created = await this.prisma.fuelRecord.create({
      data: {
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        suppliedAt: new Date(input.suppliedAt),
        fuelType: input.fuelType,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        totalCost,
        station: input.station,
        ticketNumber: input.ticketNumber,
        odometer: input.odometer,
        efficiencyKmPerUnit: efficiencyKmPerUnit ?? undefined,
        notes: input.notes,
        registeredById: actingUserId,
      },
    });
    return this.serialize(created);
  }

  private serialize(record: FuelRecordRow) {
    return {
      ...record,
      quantity: Number(record.quantity),
      unitPrice: Number(record.unitPrice),
      totalCost: Number(record.totalCost),
      efficiencyKmPerUnit:
        record.efficiencyKmPerUnit === null
          ? null
          : Number(record.efficiencyKmPerUnit),
    };
  }
}
