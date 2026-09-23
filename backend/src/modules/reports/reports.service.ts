import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { type UnitScope } from '../../common/unit-scope.js';
import { LogbookFilterArgs } from './dto/logbook-filter.args.js';
import {
  LogbookEntry,
  LogbookEntryType,
} from './entities/logbook-entry.entity.js';

const TRIP_INCLUDE = {
  assignment: { include: { vehicle: true, driver: true, request: true } },
} satisfies Prisma.TripInclude;

type TripWithRelations = Prisma.TripGetPayload<{
  include: typeof TRIP_INCLUDE;
}>;

const FUEL_RECORD_INCLUDE = {
  vehicle: true,
  driver: true,
} satisfies Prisma.FuelRecordInclude;

type FuelRecordWithRelations = Prisma.FuelRecordGetPayload<{
  include: typeof FUEL_RECORD_INCLUDE;
}>;

/**
 * Bitácora de conductores (reporte del módulo Combustible): une `Trip` y
 * `FuelRecord` en una sola línea de tiempo. No hay un `UNION`/vista en la
 * base de datos que junte ambas tablas, así que se consultan por separado
 * (mismo filtro de vehículo/fecha en las dos) y se mezclan y paginan en
 * memoria — a la escala de un parque institucional (cientos, no millones de
 * filas por rango de fechas razonable) es preferible a mantener una vista
 * SQL sólo para este reporte.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async driverLogbook(filters: LogbookFilterArgs, scope: UnitScope = null) {
    const vehicleWhere = this.buildVehicleWhere(filters, scope);
    const dateRange =
      filters.fromDate || filters.toDate
        ? {
            ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
            ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
          }
        : undefined;
    const hasVehicleFilter = Object.keys(vehicleWhere).length > 0;

    const [trips, fuelRecords] = await Promise.all([
      this.prisma.trip.findMany({
        where: {
          ...(dateRange ? { departureAt: dateRange } : {}),
          assignment: {
            ...(filters.driverId ? { driverId: filters.driverId } : {}),
            ...(hasVehicleFilter ? { vehicle: vehicleWhere } : {}),
          },
        },
        include: TRIP_INCLUDE,
        orderBy: { departureAt: 'desc' },
      }),
      this.prisma.fuelRecord.findMany({
        where: {
          ...(dateRange ? { suppliedAt: dateRange } : {}),
          ...(filters.driverId ? { driverId: filters.driverId } : {}),
          ...(hasVehicleFilter ? { vehicle: vehicleWhere } : {}),
        },
        include: FUEL_RECORD_INCLUDE,
        orderBy: { suppliedAt: 'desc' },
      }),
    ]);

    const entries = [
      ...trips.map((trip) => this.tripToEntry(trip)),
      ...fuelRecords.map((record) => this.fuelRecordToEntry(record)),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const skip = filters.skip ?? 0;
    const take = filters.take ?? 50;
    return { items: entries.slice(skip, skip + take), total: entries.length };
  }

  /// Combina el alcance por unidad del usuario (spec 015, RF-12/RF-14) con el
  /// filtro de unidad que el reporte deja elegir, como dos condiciones
  /// independientes sobre `unitAssignments` — nunca una pisando a la otra:
  /// un TRANSPORTES no puede ver otra unidad aunque la pida por filtro.
  private buildVehicleWhere(
    filters: LogbookFilterArgs,
    scope: UnitScope,
  ): Prisma.VehicleWhereInput {
    const and: Prisma.VehicleWhereInput[] = [];
    if (filters.vehicleType) {
      and.push({ type: filters.vehicleType });
    }
    if (filters.unitId) {
      and.push({
        unitAssignments: { some: { unitId: filters.unitId, endDate: null } },
      });
    }
    if (scope !== null) {
      and.push({
        unitAssignments: { some: { unitId: { in: scope }, endDate: null } },
      });
    }
    return and.length > 0 ? { AND: and } : {};
  }

  private tripToEntry(trip: TripWithRelations): LogbookEntry {
    const { assignment } = trip;
    return {
      id: `trip:${trip.id}`,
      type: LogbookEntryType.TRIP,
      occurredAt: trip.departureAt,
      vehicle: assignment.vehicle,
      driver: assignment.driver,
      destination: assignment.request.destination,
      returnAt: trip.returnAt,
      distanceKm: trip.distanceKm,
      departureOdometer: trip.departureOdometer,
      returnOdometer: trip.returnOdometer,
      fuelType: null,
      quantity: null,
      totalCost: null,
      station: null,
      odometer: null,
    };
  }

  private fuelRecordToEntry(record: FuelRecordWithRelations): LogbookEntry {
    return {
      id: `fuel:${record.id}`,
      type: LogbookEntryType.FUEL,
      occurredAt: record.suppliedAt,
      vehicle: record.vehicle,
      driver: record.driver,
      destination: null,
      returnAt: null,
      distanceKm: null,
      departureOdometer: null,
      returnOdometer: null,
      fuelType: record.fuelType,
      quantity: Number(record.quantity),
      totalCost: Number(record.totalCost),
      station: record.station,
      odometer: record.odometer,
    };
  }
}
