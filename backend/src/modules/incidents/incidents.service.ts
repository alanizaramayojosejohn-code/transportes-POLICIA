import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  assertVehicleInScope,
  unitScopeFor,
  type UnitScope,
} from '../../common/unit-scope.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { CreateIncidentInput } from './dto/create-incident.input.js';
import { IncidentFilterArgs } from './dto/incident-filter.args.js';

/**
 * Incidentes vehiculares (spec 011). Cuando el registro incluye un estado
 * posterior, además de crear el incidente se agrega esa entrada al
 * historial de condición del vehículo (RF-4), reutilizando
 * `VehiclesService.registerCondition` (spec 001) en vez de reimplementarlo.
 */
@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async findAll(filters: IncidentFilterArgs, scope: UnitScope = null) {
    const where: Prisma.IncidentWhereInput = {
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      /// Alcance por unidad (spec 015, RF-12): un TRANSPORTES sólo ve
      /// incidentes de vehículos con asignación vigente a alguna de sus
      /// unidades.
      ...(scope !== null
        ? {
            vehicle: {
              unitAssignments: {
                some: { unitId: { in: scope }, endDate: null },
              },
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { place: { contains: filters.search, mode: 'insensitive' } },
              {
                vehicle: {
                  plate: { contains: filters.search, mode: 'insensitive' },
                },
              },
              {
                driver: {
                  firstName: { contains: filters.search, mode: 'insensitive' },
                },
              },
              {
                driver: {
                  lastName: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return { items, total };
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

  /// RF-1 a RF-4.
  async create(input: CreateIncidentInput, actingUser: AuthenticatedUser) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }
    /// RF-14 (spec 015): un TRANSPORTES sólo registra incidentes de
    /// vehículos con asignación vigente a alguna de sus unidades.
    await assertVehicleInScope(
      this.prisma,
      unitScopeFor(actingUser),
      vehicle.id,
    );

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

    const incident = await this.prisma.incident.create({
      data: {
        code: this.generateCode(),
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        type: input.type,
        occurredAt: new Date(input.occurredAt),
        place: input.place,
        description: input.description,
        damages: input.damages,
        policeReportNumber: input.policeReportNumber,
        registeredById: actingUser.id,
      },
    });

    if (input.postCondition) {
      await this.vehiclesService.registerCondition(
        input.vehicleId,
        { code: input.postCondition, reason: `Incidente ${incident.code}` },
        actingUser.role,
      );
    }

    return incident;
  }

  private generateCode(): string {
    return `INC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
}
