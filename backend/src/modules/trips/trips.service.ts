import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CreateTripInput } from './dto/create-trip.input.js';
import { CloseTripInput } from './dto/close-trip.input.js';
import { TripFilterArgs } from './dto/trip-filter.args.js';

/**
 * Registro de salida y llegada de vehículos (spec 006). Un `Trip` no existe
 * suelto en el esquema: cuelga de un `Assignment`, que a su vez cuelga de
 * una `VehicleRequest` (RF-03/04/05). `create` genera esos dos registros por
 * detrás, ya aprobados, para que la interfaz siga siendo un único
 * formulario de salida — ver spec 006, cabecera, para la justificación.
 */
@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: TripFilterArgs) {
    const where: Prisma.TripWhereInput = {
      ...(filters.open !== undefined
        ? { returnAt: filters.open ? null : { not: null } }
        : {}),
      ...(filters.vehicleId || filters.driverId
        ? {
            assignment: {
              ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
              ...(filters.driverId ? { driverId: filters.driverId } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              {
                assignment: {
                  vehicle: {
                    plate: { contains: filters.search, mode: 'insensitive' },
                  },
                },
              },
              {
                assignment: {
                  driver: {
                    firstName: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                assignment: {
                  driver: {
                    lastName: { contains: filters.search, mode: 'insensitive' },
                  },
                },
              },
              {
                assignment: {
                  request: {
                    destination: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { departureAt: 'desc' },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      throw new NotFoundException(`Recorrido ${id} no encontrado`);
    }
    return trip;
  }

  /// Campos resueltos `vehicle`/`driver`/`destination` en el resolver.
  async getVehicle(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      select: { vehicle: true },
    });
    return assignment.vehicle;
  }

  async getDriver(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      select: { driver: true },
    });
    return assignment.driver;
  }

  async getDestination(assignmentId: string) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      select: { request: { select: { destination: true } } },
    });
    return assignment.request.destination;
  }

  /// RF-1 a RF-4.
  async create(input: CreateTripInput, actingUser: AuthenticatedUser) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }
    const driver = await this.prisma.driver.findUnique({
      where: { id: input.driverId },
    });
    if (!driver) {
      throw new NotFoundException(`Conductor ${input.driverId} no encontrado`);
    }
    if (!driver.isActive) {
      throw new ConflictException('El conductor está inactivo');
    }

    const openTrip = await this.prisma.trip.findFirst({
      where: { returnAt: null, assignment: { vehicleId: input.vehicleId } },
    });
    if (openTrip) {
      throw new ConflictException('El vehículo ya tiene un recorrido abierto');
    }

    const actingUserId = actingUser.id;
    const departureAt = new Date(input.departureAt);

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.vehicleRequest.create({
        data: {
          code: this.generateRequestCode(),
          reason: 'Recorrido operativo',
          destination: input.destination,
          requestedFrom: departureAt,
          requestedTo: departureAt,
          status: 'APPROVED',
          reviewedAt: new Date(),
          requesterId: actingUserId,
          reviewedById: actingUserId,
        },
      });
      const assignment = await tx.assignment.create({
        data: {
          requestId: request.id,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          assignedById: actingUserId,
          status: 'ACTIVE',
        },
      });
      return tx.trip.create({
        data: {
          assignmentId: assignment.id,
          departureAt,
          departureOdometer: input.departureOdometer,
          departureFuelLevel: input.departureFuelLevel,
          departureConditionNotes: input.departureConditionNotes,
          departureRegisteredById: actingUserId,
        },
      });
    });
  }

  /// RF-5 a RF-7.
  async close(
    id: string,
    input: CloseTripInput,
    actingUser: AuthenticatedUser,
  ) {
    const trip = await this.findOne(id);
    if (trip.returnAt) {
      throw new ConflictException('El recorrido ya está cerrado');
    }
    if (input.returnOdometer < trip.departureOdometer) {
      throw new ConflictException(
        'El kilometraje de llegada no puede ser menor al de salida',
      );
    }

    const actingUserId = actingUser.id;
    const returnAt = input.returnAt ? new Date(input.returnAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.trip.update({
        where: { id },
        data: {
          returnAt,
          returnOdometer: input.returnOdometer,
          returnFuelLevel: input.returnFuelLevel,
          returnConditionNotes: input.returnConditionNotes,
          damagesFound: input.damagesFound,
          incidentNotes: input.incidentNotes,
          distanceKm: input.returnOdometer - trip.departureOdometer,
          returnRegisteredById: actingUserId,
        },
      });
      await tx.assignment.update({
        where: { id: trip.assignmentId },
        data: { status: 'COMPLETED' },
      });
      return closed;
    });
  }

  private generateRequestCode(): string {
    return `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
}
