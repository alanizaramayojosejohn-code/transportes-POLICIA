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
import {
  MaintenanceStatus,
  MaintenanceType,
  type VehicleType,
} from '../../generated/prisma/enums.js';
import { dayRange } from '../../common/day-range.js';
import { LogbookFilterArgs } from './dto/logbook-filter.args.js';
import { VehicleHistoryFilterArgs } from './dto/vehicle-history-filter.args.js';
import { ConsolidatedReportFilterArgs } from './dto/consolidated-report-filter.args.js';
import {
  LogbookEntry,
  LogbookEntryType,
} from './entities/logbook-entry.entity.js';
import {
  VehicleHistoryEntry,
  VehicleHistoryEntryType,
} from './entities/vehicle-history-entry.entity.js';
import {
  NO_UNIT_GROUP_ID,
  ReportGroupBy,
} from './entities/consolidated-report.entity.js';
import { FuelConsumptionRow } from './entities/fuel-consumption-report.entity.js';
import { MaintenanceCostRow } from './entities/maintenance-cost-report.entity.js';
import { MileageRow } from './entities/mileage-report.entity.js';

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

/// Recorte de flota que comparten la bitácora y los reportes consolidados.
interface VehicleScopedFilters {
  vehicleId?: string;
  unitId?: string;
  vehicleType?: VehicleType;
}

const GROUP_VEHICLE_SELECT = {
  id: true,
  plate: true,
  brand: true,
  model: true,
  unitAssignments: {
    where: { endDate: null },
    select: { unitId: true, unit: { select: { name: true } } },
    take: 1,
  },
} satisfies Prisma.VehicleSelect;

type GroupVehicle = Prisma.VehicleGetPayload<{
  select: typeof GROUP_VEHICLE_SELECT;
}>;

/// Una fila de reporte consolidado antes de calcular sus promedios: la
/// identificación del grupo más las métricas crudas que se le acumularon.
interface GroupedMetrics<M> {
  groupId: string;
  groupLabel: string;
  groupDetail: string | null;
  vehicleCount: number;
  metrics: M;
}

interface FuelMetrics {
  records: number;
  liters: number;
  cost: number;
  distanceKm: number;
}

interface MaintenanceMetrics {
  orders: number;
  preventive: number;
  corrective: number;
  cost: number;
}

interface MileageMetrics {
  trips: number;
  closedTrips: number;
  distanceKm: number;
}

/// Dos decimales: los importes son Bs. y los promedios no se muestran con más
/// precisión que eso en ninguna pantalla.
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round2(numerator / denominator) : null;
}

function sumBy<T>(rows: readonly T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

/// Orden de los reportes consolidados: primero lo más alto de la métrica
/// principal (es lo que se busca al abrir el reporte), y a igualdad, por
/// etiqueta, para que la lista no baile entre consultas iguales.
function byMetricDesc<T extends { groupLabel: string }>(
  metric: (row: T) => number,
): (a: T, b: T) => number {
  return (a, b) =>
    metric(b) - metric(a) || a.groupLabel.localeCompare(b.groupLabel, 'es');
}

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
  ///
  /// Recibe la forma del filtro, no un `ArgsType` concreto: lo comparten la
  /// bitácora y los tres reportes consolidados, que recortan la flota igual.
  private buildVehicleWhere(
    filters: VehicleScopedFilters,
    scope: UnitScope,
  ): Prisma.VehicleWhereInput {
    const and: Prisma.VehicleWhereInput[] = [];
    if (filters.vehicleId) {
      and.push({ id: filters.vehicleId });
    }
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

  /**
   * Consumo de combustible consolidado (spec 018, RF-18): una fila por
   * vehículo o por unidad con las cargas, los litros, el importe y el
   * rendimiento del periodo. Sólo aparecen los vehículos con al menos una
   * carga en el rango: una lista de cientos de ceros no es un reporte de
   * consumo. Los kilómetros salen de los recorridos del mismo rango, no de
   * las cargas, porque el rendimiento que interesa aquí es del periodo
   * completo y no el de carga contra carga que ya guarda `FuelRecord`.
   */
  async fuelConsumptionReport(
    filters: ConsolidatedReportFilterArgs,
    scope: UnitScope = null,
  ) {
    const range = dayRange(filters.fromDate, filters.toDate);
    const groups = await this.prisma.fuelRecord.groupBy({
      by: ['vehicleId'],
      where: {
        ...(range ? { suppliedAt: range } : {}),
        ...this.vehicleRelationWhere(filters, scope),
      },
      _count: { _all: true },
      _sum: { quantity: true, totalCost: true },
    });

    const perVehicle = new Map<string, FuelMetrics>(
      groups.map((group) => [
        group.vehicleId,
        {
          records: group._count._all,
          liters: Number(group._sum.quantity ?? 0),
          cost: Number(group._sum.totalCost ?? 0),
          distanceKm: 0,
        },
      ]),
    );

    if (perVehicle.size > 0) {
      const trips = await this.prisma.trip.findMany({
        where: {
          ...(range ? { departureAt: range } : {}),
          assignment: { vehicleId: { in: [...perVehicle.keys()] } },
        },
        select: {
          distanceKm: true,
          assignment: { select: { vehicleId: true } },
        },
      });
      for (const trip of trips) {
        const metrics = perVehicle.get(trip.assignment.vehicleId);
        if (metrics) {
          metrics.distanceKm += trip.distanceKm ?? 0;
        }
      }
    }

    const grouped = await this.foldByGroup(
      perVehicle,
      filters.groupBy,
      (a, b) => ({
        records: a.records + b.records,
        liters: a.liters + b.liters,
        cost: a.cost + b.cost,
        distanceKm: a.distanceKm + b.distanceKm,
      }),
    );

    const rows: FuelConsumptionRow[] = grouped
      .map((group) => ({
        ...this.rowIdentity(group),
        records: group.metrics.records,
        liters: round2(group.metrics.liters),
        totalCost: round2(group.metrics.cost),
        avgUnitPrice: ratio(group.metrics.cost, group.metrics.liters),
        distanceKm: group.metrics.distanceKm,
        efficiencyKmPerLiter:
          group.metrics.distanceKm > 0
            ? ratio(group.metrics.distanceKm, group.metrics.liters)
            : null,
      }))
      .sort(byMetricDesc((row) => row.liters));

    const totalLiters = round2(sumBy(rows, (row) => row.liters));
    const totalDistanceKm = sumBy(rows, (row) => row.distanceKm);
    return {
      ...this.paginate(rows, filters),
      totalRecords: sumBy(rows, (row) => row.records),
      totalLiters,
      totalCost: round2(sumBy(rows, (row) => row.totalCost)),
      totalDistanceKm,
      totalEfficiencyKmPerLiter:
        totalDistanceKm > 0 ? ratio(totalDistanceKm, totalLiters) : null,
    };
  }

  /**
   * Costo de mantenimiento consolidado (spec 018, RF-19): una fila por
   * vehículo o por unidad con las órdenes del periodo, separadas en
   * preventivas y correctivas, y su costo. Las anuladas no cuentan y los
   * vehículos sin órdenes en el rango no aparecen.
   */
  async maintenanceCostReport(
    filters: ConsolidatedReportFilterArgs,
    scope: UnitScope = null,
  ) {
    const range = dayRange(filters.fromDate, filters.toDate);
    const groups = await this.prisma.maintenanceOrder.groupBy({
      by: ['vehicleId', 'type'],
      where: {
        status: { not: MaintenanceStatus.CANCELLED },
        ...(range ? { createdAt: range } : {}),
        ...this.vehicleRelationWhere(filters, scope),
      },
      _count: { _all: true },
      _sum: { totalCost: true },
    });

    const perVehicle = new Map<string, MaintenanceMetrics>();
    for (const group of groups) {
      const orders = group._count._all;
      const current = perVehicle.get(group.vehicleId) ?? {
        orders: 0,
        preventive: 0,
        corrective: 0,
        cost: 0,
      };
      current.orders += orders;
      if (group.type === MaintenanceType.PREVENTIVE) {
        current.preventive += orders;
      } else {
        current.corrective += orders;
      }
      current.cost += Number(group._sum.totalCost ?? 0);
      perVehicle.set(group.vehicleId, current);
    }

    const grouped = await this.foldByGroup(
      perVehicle,
      filters.groupBy,
      (a, b) => ({
        orders: a.orders + b.orders,
        preventive: a.preventive + b.preventive,
        corrective: a.corrective + b.corrective,
        cost: a.cost + b.cost,
      }),
    );

    const rows: MaintenanceCostRow[] = grouped
      .map((group) => ({
        ...this.rowIdentity(group),
        orders: group.metrics.orders,
        preventive: group.metrics.preventive,
        corrective: group.metrics.corrective,
        totalCost: round2(group.metrics.cost),
        avgCost: ratio(group.metrics.cost, group.metrics.orders),
      }))
      .sort(byMetricDesc((row) => row.totalCost));

    return {
      ...this.paginate(rows, filters),
      totalOrders: sumBy(rows, (row) => row.orders),
      totalPreventive: sumBy(rows, (row) => row.preventive),
      totalCorrective: sumBy(rows, (row) => row.corrective),
      totalCost: round2(sumBy(rows, (row) => row.totalCost)),
    };
  }

  /**
   * Kilometraje recorrido consolidado (spec 018, RF-20): una fila por vehículo
   * o por unidad con las salidas del periodo, cuántas retornaron y los
   * kilómetros acumulados. Los recorridos abiertos cuentan como salida pero no
   * aportan kilómetros: `distanceKm` sólo se calcula al cerrar el recorrido.
   */
  async mileageReport(
    filters: ConsolidatedReportFilterArgs,
    scope: UnitScope = null,
  ) {
    const range = dayRange(filters.fromDate, filters.toDate);
    const vehicleWhere = this.buildVehicleWhere(filters, scope);
    const hasVehicleFilter = Object.keys(vehicleWhere).length > 0;

    /// `Trip` no tiene `vehicleId` propio (cuelga de `Assignment`), así que
    /// `groupBy` no puede agrupar por vehículo: se traen los recorridos del
    /// rango y se acumulan en memoria, igual que `driverLogbook`.
    const trips = await this.prisma.trip.findMany({
      where: {
        ...(range ? { departureAt: range } : {}),
        assignment: hasVehicleFilter ? { vehicle: vehicleWhere } : undefined,
      },
      select: {
        distanceKm: true,
        returnAt: true,
        assignment: { select: { vehicleId: true } },
      },
    });

    const perVehicle = new Map<string, MileageMetrics>();
    for (const trip of trips) {
      const { vehicleId } = trip.assignment;
      const current = perVehicle.get(vehicleId) ?? {
        trips: 0,
        closedTrips: 0,
        distanceKm: 0,
      };
      current.trips += 1;
      if (trip.returnAt) {
        current.closedTrips += 1;
      }
      current.distanceKm += trip.distanceKm ?? 0;
      perVehicle.set(vehicleId, current);
    }

    const grouped = await this.foldByGroup(
      perVehicle,
      filters.groupBy,
      (a, b) => ({
        trips: a.trips + b.trips,
        closedTrips: a.closedTrips + b.closedTrips,
        distanceKm: a.distanceKm + b.distanceKm,
      }),
    );

    const rows: MileageRow[] = grouped
      .map((group) => ({
        ...this.rowIdentity(group),
        trips: group.metrics.trips,
        closedTrips: group.metrics.closedTrips,
        distanceKm: group.metrics.distanceKm,
        avgDistanceKm: ratio(
          group.metrics.distanceKm,
          group.metrics.closedTrips,
        ),
      }))
      .sort(byMetricDesc((row) => row.distanceKm));

    return {
      ...this.paginate(rows, filters),
      totalTrips: sumBy(rows, (row) => row.trips),
      totalClosedTrips: sumBy(rows, (row) => row.closedTrips),
      totalDistanceKm: sumBy(rows, (row) => row.distanceKm),
    };
  }

  /// Filtro de flota como condición sobre la relación `vehicle` de la tabla de
  /// hechos. Vacío cuando no hay nada que recortar: `{ vehicle: {} }` sería
  /// una condición inútil en cada consulta.
  private vehicleRelationWhere(
    filters: VehicleScopedFilters,
    scope: UnitScope,
  ): { vehicle?: Prisma.VehicleWhereInput } {
    const where = this.buildVehicleWhere(filters, scope);
    return Object.keys(where).length > 0 ? { vehicle: where } : {};
  }

  /**
   * Pasa de métricas por vehículo a métricas por grupo (spec 018): agrupando
   * por vehículo cada fila queda igual pero con su placa y su unidad vigente;
   * agrupando por unidad, los vehículos de la misma unidad se suman con
   * `merge`. Los vehículos sin asignación de unidad vigente caen todos en una
   * fila aparte (`NO_UNIT_GROUP_ID`) en vez de desaparecer del total.
   */
  private async foldByGroup<M>(
    perVehicle: Map<string, M>,
    groupBy: ReportGroupBy | undefined,
    merge: (a: M, b: M) => M,
  ): Promise<GroupedMetrics<M>[]> {
    if (perVehicle.size === 0) {
      return [];
    }
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: [...perVehicle.keys()] } },
      select: GROUP_VEHICLE_SELECT,
    });

    const byGroup = new Map<string, GroupedMetrics<M>>();
    for (const vehicle of vehicles) {
      const metrics = perVehicle.get(vehicle.id);
      if (!metrics) {
        continue;
      }
      const identity = this.groupIdentity(vehicle, groupBy);
      const existing = byGroup.get(identity.groupId);
      if (existing) {
        existing.vehicleCount += 1;
        existing.metrics = merge(existing.metrics, metrics);
      } else {
        byGroup.set(identity.groupId, {
          ...identity,
          vehicleCount: 1,
          metrics,
        });
      }
    }
    return [...byGroup.values()];
  }

  private groupIdentity(
    vehicle: GroupVehicle,
    groupBy: ReportGroupBy | undefined,
  ): Pick<GroupedMetrics<unknown>, 'groupId' | 'groupLabel' | 'groupDetail'> {
    const current = vehicle.unitAssignments[0] ?? null;
    if (groupBy === ReportGroupBy.UNIT) {
      return {
        groupId: current?.unitId ?? NO_UNIT_GROUP_ID,
        groupLabel: current?.unit.name ?? 'Sin unidad asignada',
        groupDetail: null,
      };
    }
    const detail = [
      [vehicle.brand, vehicle.model].filter(Boolean).join(' '),
      current?.unit.name,
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      groupId: vehicle.id,
      groupLabel: vehicle.plate,
      groupDetail: detail || null,
    };
  }

  private rowIdentity<M>(
    group: GroupedMetrics<M>,
  ): Omit<GroupedMetrics<M>, 'metrics'> {
    return {
      groupId: group.groupId,
      groupLabel: group.groupLabel,
      groupDetail: group.groupDetail,
      vehicleCount: group.vehicleCount,
    };
  }

  /// Se pagina la lista ya consolidada y ordenada, no la consulta: el grupo
  /// que corresponde a cada fila sólo se conoce después de agrupar.
  private paginate<T>(
    rows: T[],
    filters: ConsolidatedReportFilterArgs,
  ): { items: T[]; total: number } {
    const skip = filters.skip ?? 0;
    const take = filters.take ?? 20;
    return { items: rows.slice(skip, skip + take), total: rows.length };
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
