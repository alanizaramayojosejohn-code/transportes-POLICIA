import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  assertVehicleInScope,
  unitScopeFor,
  type UnitScope,
} from '../../common/unit-scope.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { MaintenanceOrderModel } from '../../generated/prisma/models/MaintenanceOrder.js';
import { LogbookFilterArgs } from './dto/logbook-filter.args.js';
import { VehicleHistoryFilterArgs } from './dto/vehicle-history-filter.args.js';
import {
  LogbookEntry,
  LogbookEntryType,
} from './entities/logbook-entry.entity.js';
import {
  VehicleHistoryEntry,
  VehicleHistoryEntryType,
} from './entities/vehicle-history-entry.entity.js';

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

const HISTORY_TRIP_INCLUDE = {
  assignment: { include: { driver: true, request: true } },
} satisfies Prisma.TripInclude;

type HistoryTripWithRelations = Prisma.TripGetPayload<{
  include: typeof HISTORY_TRIP_INCLUDE;
}>;

const HISTORY_UNIT_ASSIGNMENT_INCLUDE = {
  unit: true,
} satisfies Prisma.UnitAssignmentInclude;

type HistoryUnitAssignmentWithRelations = Prisma.UnitAssignmentGetPayload<{
  include: typeof HISTORY_UNIT_ASSIGNMENT_INCLUDE;
}>;

const HISTORY_DRIVER_ASSIGNMENT_INCLUDE = {
  driver: true,
} satisfies Prisma.VehicleDriverAssignmentInclude;

type HistoryDriverAssignmentWithRelations =
  Prisma.VehicleDriverAssignmentGetPayload<{
    include: typeof HISTORY_DRIVER_ASSIGNMENT_INCLUDE;
  }>;

const HISTORY_FUEL_RECORD_INCLUDE = {
  driver: true,
} satisfies Prisma.FuelRecordInclude;

type HistoryFuelRecordWithRelations = Prisma.FuelRecordGetPayload<{
  include: typeof HISTORY_FUEL_RECORD_INCLUDE;
}>;

const HISTORY_INCIDENT_INCLUDE = {
  driver: true,
} satisfies Prisma.IncidentInclude;

type HistoryIncidentWithRelations = Prisma.IncidentGetPayload<{
  include: typeof HISTORY_INCIDENT_INCLUDE;
}>;

const HISTORY_STOCK_MOVEMENT_INCLUDE = {
  sparePart: true,
} satisfies Prisma.StockMovementInclude;

type HistoryStockMovementWithRelations = Prisma.StockMovementGetPayload<{
  include: typeof HISTORY_STOCK_MOVEMENT_INCLUDE;
}>;

/** Todos los campos opcionales del historial en `null`, para no repetirlos en cada mapeo. */
const EMPTY_HISTORY_ENTRY: Omit<
  VehicleHistoryEntry,
  'id' | 'type' | 'occurredAt'
> = {
  driver: null,
  unitName: null,
  destination: null,
  returnAt: null,
  distanceKm: null,
  fuelType: null,
  station: null,
  quantity: null,
  amount: null,
  maintenanceType: null,
  maintenanceStatus: null,
  workshopName: null,
  incidentType: null,
  incidentSeverity: null,
  place: null,
  stockMovementType: null,
  sparePartName: null,
  description: null,
};

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

  /**
   * Historial integral del vehículo (spec 018, RF-12 a RF-17): junta siete
   * fuentes en una sola línea de tiempo paginada. ADMINISTRADOR/CONSULTA
   * eligen cualquier vehículo; TRANSPORTES sólo uno de su alcance
   * (`assertVehicleInScope`); CONDUCTOR no elige — se usa el vehículo del que
   * está a cargo vigente y sólo se ven eventos desde que quedó a cargo
   * (RF-16/RF-17). Cualquier otro rol nunca llega aquí (`@Roles` en el
   * resolver ya lo rechaza).
   */
  async vehicleHistory(
    filters: VehicleHistoryFilterArgs,
    user: AuthenticatedUser,
  ) {
    const { vehicleId, minDate } = await this.resolveVehicleHistoryScope(
      filters,
      user,
    );
    if (!vehicleId) {
      return { items: [], total: 0 };
    }

    const dateRange = this.buildHistoryDateRange(
      filters.fromDate,
      filters.toDate,
      minDate,
    );

    const [
      unitAssignments,
      driverAssignments,
      trips,
      fuelRecords,
      maintenanceOrders,
      incidents,
      stockMovements,
    ] = await Promise.all([
      this.prisma.unitAssignment.findMany({
        where: { vehicleId, ...(dateRange ? { startDate: dateRange } : {}) },
        include: HISTORY_UNIT_ASSIGNMENT_INCLUDE,
      }),
      this.prisma.vehicleDriverAssignment.findMany({
        where: { vehicleId, ...(dateRange ? { startDate: dateRange } : {}) },
        include: HISTORY_DRIVER_ASSIGNMENT_INCLUDE,
      }),
      this.prisma.trip.findMany({
        where: {
          assignment: { vehicleId },
          ...(dateRange ? { departureAt: dateRange } : {}),
        },
        include: HISTORY_TRIP_INCLUDE,
      }),
      this.prisma.fuelRecord.findMany({
        where: { vehicleId, ...(dateRange ? { suppliedAt: dateRange } : {}) },
        include: HISTORY_FUEL_RECORD_INCLUDE,
      }),
      this.prisma.maintenanceOrder.findMany({
        where: { vehicleId, ...(dateRange ? { createdAt: dateRange } : {}) },
      }),
      this.prisma.incident.findMany({
        where: { vehicleId, ...(dateRange ? { occurredAt: dateRange } : {}) },
        include: HISTORY_INCIDENT_INCLUDE,
      }),
      this.prisma.stockMovement.findMany({
        where: { vehicleId, ...(dateRange ? { createdAt: dateRange } : {}) },
        include: HISTORY_STOCK_MOVEMENT_INCLUDE,
      }),
    ]);

    let entries: VehicleHistoryEntry[] = [
      ...unitAssignments.map((a) => this.unitAssignmentToHistoryEntry(a)),
      ...driverAssignments.map((a) => this.driverAssignmentToHistoryEntry(a)),
      ...trips.map((t) => this.tripToHistoryEntry(t)),
      ...fuelRecords.map((f) => this.fuelRecordToHistoryEntry(f)),
      ...maintenanceOrders.map((m) => this.maintenanceOrderToHistoryEntry(m)),
      ...incidents.map((i) => this.incidentToHistoryEntry(i)),
      ...stockMovements.map((s) => this.stockMovementToHistoryEntry(s)),
    ];

    if (filters.types && filters.types.length > 0) {
      const allowed = new Set(filters.types);
      entries = entries.filter((entry) => allowed.has(entry.type));
    }

    entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const skip = filters.skip ?? 0;
    const take = filters.take ?? 20;
    return { items: entries.slice(skip, skip + take), total: entries.length };
  }

  /// RF-12 (ADMINISTRADOR/CONSULTA: cualquier vehículo), RF-13 (TRANSPORTES:
  /// acotado a su unidad) y RF-16 (CONDUCTOR: siempre su vehículo a cargo
  /// vigente, sin selector). `vehicleId: null` significa "sin resultado", no
  /// error: cubre al CONDUCTOR sin encargo vigente (RF-16c).
  private async resolveVehicleHistoryScope(
    filters: VehicleHistoryFilterArgs,
    user: AuthenticatedUser,
  ): Promise<{ vehicleId: string | null; minDate?: Date }> {
    if (user.role === 'CONDUCTOR') {
      if (!user.personnelId) {
        return { vehicleId: null };
      }
      const current = await this.prisma.vehicleDriverAssignment.findFirst({
        where: { driverId: user.personnelId, endDate: null },
      });
      if (!current) {
        return { vehicleId: null };
      }
      return { vehicleId: current.vehicleId, minDate: current.startDate };
    }

    if (!filters.vehicleId) {
      throw new BadRequestException('Debe seleccionar un vehículo');
    }
    if (user.role === 'TRANSPORTES') {
      await assertVehicleInScope(
        this.prisma,
        unitScopeFor(user),
        filters.vehicleId,
      );
    }
    return { vehicleId: filters.vehicleId };
  }

  /// RF-17: la fecha mínima efectiva es la más tardía entre el filtro pedido
  /// y el propio límite del conductor (`minDate`), nunca la más temprana.
  private buildHistoryDateRange(
    fromDate: string | undefined,
    toDate: string | undefined,
    minDate: Date | undefined,
  ): { gte?: Date; lte?: Date } | undefined {
    const requestedFrom = fromDate ? new Date(fromDate) : undefined;
    const gte =
      requestedFrom && minDate
        ? requestedFrom > minDate
          ? requestedFrom
          : minDate
        : (requestedFrom ?? minDate);
    const lte = toDate ? new Date(toDate) : undefined;
    if (!gte && !lte) {
      return undefined;
    }
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  }

  private unitAssignmentToHistoryEntry(
    assignment: HistoryUnitAssignmentWithRelations,
  ): VehicleHistoryEntry {
    return {
      ...EMPTY_HISTORY_ENTRY,
      id: `unit:${assignment.id}`,
      type: VehicleHistoryEntryType.UNIT_ASSIGNMENT,
      occurredAt: assignment.startDate,
      unitName: assignment.unit.name,
      description: assignment.reason,
    };
  }

  private driverAssignmentToHistoryEntry(
    assignment: HistoryDriverAssignmentWithRelations,
  ): VehicleHistoryEntry {
    return {
      ...EMPTY_HISTORY_ENTRY,
      id: `driver-assignment:${assignment.id}`,
      type: VehicleHistoryEntryType.DRIVER_ASSIGNMENT,
      occurredAt: assignment.startDate,
      driver: assignment.driver,
      description: assignment.notes,
    };
  }

  private tripToHistoryEntry(
    trip: HistoryTripWithRelations,
  ): VehicleHistoryEntry {
    return {
      ...EMPTY_HISTORY_ENTRY,
      id: `trip:${trip.id}`,
      type: VehicleHistoryEntryType.TRIP,
      occurredAt: trip.departureAt,
      driver: trip.assignment.driver,
      destination: trip.assignment.request.destination,
      returnAt: trip.returnAt,
      distanceKm: trip.distanceKm,
    };
  }

  private fuelRecordToHistoryEntry(
    record: HistoryFuelRecordWithRelations,
  ): VehicleHistoryEntry {
    return {
      ...EMPTY_HISTORY_ENTRY,
      id: `fuel:${record.id}`,
      type: VehicleHistoryEntryType.FUEL,
      occurredAt: record.suppliedAt,
      driver: record.driver,
      fuelType: record.fuelType,
      station: record.station,
      quantity: Number(record.quantity),
      amount: Number(record.totalCost),
    };
  }

  private maintenanceOrderToHistoryEntry(
    order: MaintenanceOrderModel,
  ): VehicleHistoryEntry {
    return {
      ...EMPTY_HISTORY_ENTRY,
      id: `maintenance:${order.id}`,
      type: VehicleHistoryEntryType.MAINTENANCE,
      occurredAt: order.createdAt,
      maintenanceType: order.type,
      maintenanceStatus: order.status,
      workshopName: order.workshopName,
      amount: Number(order.totalCost),
      description: order.description,
    };
  }

  private incidentToHistoryEntry(
    incident: HistoryIncidentWithRelations,
  ): VehicleHistoryEntry {
    return {
      ...EMPTY_HISTORY_ENTRY,
      id: `incident:${incident.id}`,
      type: VehicleHistoryEntryType.INCIDENT,
      occurredAt: incident.occurredAt,
      driver: incident.driver,
      incidentType: incident.type,
      incidentSeverity: incident.severity,
      place: incident.place,
      amount:
        incident.estimatedCost === null ? null : Number(incident.estimatedCost),
      description: incident.description,
    };
  }

  private stockMovementToHistoryEntry(
    movement: HistoryStockMovementWithRelations,
  ): VehicleHistoryEntry {
    return {
      ...EMPTY_HISTORY_ENTRY,
      id: `stock:${movement.id}`,
      type: VehicleHistoryEntryType.STOCK_MOVEMENT,
      occurredAt: movement.createdAt,
      stockMovementType: movement.type,
      sparePartName: movement.sparePart.name,
      quantity: Number(movement.quantity),
      description: movement.reason,
    };
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
