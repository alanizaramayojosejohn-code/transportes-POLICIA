import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  assertVehicleInScope,
  unitScopeFor,
  type UnitScope,
} from '../../common/unit-scope.js';
import { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
  ) {}

  async findAll(filters: TripFilterArgs, scope: UnitScope = null) {
    /// Alcance por unidad (spec 015, RF-12): un TRANSPORTES sólo ve
    /// recorridos de vehículos con asignación vigente a alguna de sus
    /// unidades. Se arma en un solo objeto porque ambos filtros cuelgan de
    /// `assignment`: dos entradas separadas del spread se pisarían entre sí.
    const assignmentWhere: Prisma.AssignmentWhereInput = {
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.driverId ? { driverId: filters.driverId } : {}),
      ...(scope !== null
        ? {
            vehicle: {
              unitAssignments: {
                some: { unitId: { in: scope }, endDate: null },
              },
            },
          }
        : {}),
    };

    const where: Prisma.TripWhereInput = {
      ...(filters.open !== undefined
        ? { returnAt: filters.open ? null : { not: null } }
        : {}),
      ...(Object.keys(assignmentWhere).length > 0
        ? { assignment: assignmentWhere }
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

  /// RF-1 a RF-4. RF-13/RF-14 (spec 014): un CONDUCTOR sólo puede registrar
  /// su propio recorrido, sobre el vehículo del que es encargado vigente.
  async create(input: CreateTripInput, actingUser: AuthenticatedUser) {
    if (actingUser.role === 'CONDUCTOR') {
      if (input.driverId !== actingUser.personnelId) {
        throw new ConflictException(
          'Como conductor, sólo puede registrarse a sí mismo en el recorrido',
        );
      }
      await this.vehicleDriverAssignmentsService.assertDriverOwnsVehicle(
        actingUser.personnelId,
        input.vehicleId,
      );
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }
    /// RF-14 (spec 015): un TRANSPORTES sólo registra recorridos de
    /// vehículos con asignación vigente a alguna de sus unidades.
    await assertVehicleInScope(
      this.prisma,
      unitScopeFor(actingUser),
      vehicle.id,
    );

    const driver = await this.prisma.personnel.findUnique({
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
    if (actingUser.role === 'CONDUCTOR') {
      const vehicle = await this.getVehicle(trip.assignmentId);
      await this.vehicleDriverAssignmentsService.assertDriverOwnsVehicle(
        actingUser.personnelId,
        vehicle.id,
      );
    } else {
      /// RF-14: un TRANSPORTES sólo cierra recorridos de vehículos de sus
      /// unidades. Se evita la consulta extra del vehículo cuando no hay
      /// alcance que validar (ADMINISTRADOR y el resto de roles de escritura).
      const scope = unitScopeFor(actingUser);
      if (scope !== null) {
        const vehicle = await this.getVehicle(trip.assignmentId);
        await assertVehicleInScope(this.prisma, scope, vehicle.id);
      }
    }
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
    /// El cliente ahora manda `returnAt` siempre, porque una llegada
    /// registrada sin conexión se envía más tarde y debe conservar la hora en
    /// que el vehículo volvió, no la del reenvío (spec 006, RF-15). Al ser un
    /// dato del cliente hay que validarlo: antes era `new Date()` del
    /// servidor y no podía ser anterior a la salida.
    if (returnAt < trip.departureAt) {
      throw new ConflictException(
        'La fecha de llegada no puede ser anterior a la de salida',
      );
    }

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
