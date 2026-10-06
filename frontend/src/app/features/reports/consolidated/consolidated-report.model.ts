import { VehicleType, VEHICLE_TYPE_LABEL } from '../../vehicles/vehicle.model';
import { VehicleOption } from '../../vehicles/vehicles.service';
import { UnitOption } from '../../units/unit.model';
import { formatDateEs } from '../../../shared/date-format';

export type ReportGroupBy = 'VEHICLE' | 'UNIT';

export const REPORT_GROUP_BY_LABEL: Record<ReportGroupBy, string> = {
  VEHICLE: 'Una fila por vehículo',
  UNIT: 'Una fila por unidad',
};

/**
 * Filtros de los tres reportes consolidados (spec 018). Es el estado de la
 * barra de filtros, con cadenas vacías en vez de `undefined`, porque es lo que
 * devuelven los `<select>` y los `<input type="date">`; `toReportFilter` lo
 * traduce a las variables de la consulta.
 */
export interface ReportCriteria {
  readonly vehicleId: string;
  readonly unitId: string;
  readonly vehicleType: VehicleType | '';
  readonly groupBy: ReportGroupBy;
  readonly fromDate: string;
  readonly toDate: string;
}

export const EMPTY_REPORT_CRITERIA: ReportCriteria = {
  vehicleId: '',
  unitId: '',
  vehicleType: '',
  groupBy: 'VEHICLE',
  fromDate: '',
  toDate: '',
};

export interface ReportFilter {
  vehicleId?: string;
  unitId?: string;
  vehicleType?: VehicleType;
  groupBy?: ReportGroupBy;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
}

export function toReportFilter(criteria: ReportCriteria): ReportFilter {
  return {
    vehicleId: criteria.vehicleId || undefined,
    unitId: criteria.unitId || undefined,
    vehicleType: criteria.vehicleType || undefined,
    groupBy: criteria.groupBy,
    fromDate: criteria.fromDate || undefined,
    toDate: criteria.toDate || undefined,
  };
}

export interface ReportOptions {
  readonly vehicles: readonly VehicleOption[];
  readonly units: readonly UnitOption[];
}

/**
 * Resumen legible de los filtros vigentes, para que el Excel/PDF deje
 * constancia de qué recorte de datos es. Necesita las opciones porque los
 * filtros guardan ids y en el archivo tienen que verse la placa y el nombre
 * de la unidad, no un uuid.
 */
export function reportFiltersSummary(
  criteria: ReportCriteria,
  options: ReportOptions,
): string | undefined {
  const parts: string[] = [REPORT_GROUP_BY_LABEL[criteria.groupBy]];
  if (criteria.vehicleId) {
    const plate = options.vehicles.find((v) => v.id === criteria.vehicleId)?.plate;
    if (plate) parts.push(`Vehículo: ${plate}`);
  }
  if (criteria.unitId) {
    const name = options.units.find((u) => u.id === criteria.unitId)?.name;
    if (name) parts.push(`Unidad: ${name}`);
  }
  if (criteria.vehicleType) {
    parts.push(`Tipo: ${VEHICLE_TYPE_LABEL[criteria.vehicleType]}`);
  }
  if (criteria.fromDate) parts.push(`Desde: ${formatDateEs(criteria.fromDate)}`);
  if (criteria.toDate) parts.push(`Hasta: ${formatDateEs(criteria.toDate)}`);
  return parts.join(' · ');
}

/** Columnas de identificación comunes a las filas de los tres reportes. */
interface ConsolidatedRow {
  groupId: string;
  groupLabel: string;
  groupDetail: string | null;
  vehicleCount: number;
}

export interface FuelConsumptionRow extends ConsolidatedRow {
  records: number;
  liters: number;
  totalCost: number;
  avgUnitPrice: number | null;
  distanceKm: number;
  efficiencyKmPerLiter: number | null;
}

export interface FuelConsumptionReport {
  items: FuelConsumptionRow[];
  total: number;
  totalRecords: number;
  totalLiters: number;
  totalCost: number;
  totalDistanceKm: number;
  totalEfficiencyKmPerLiter: number | null;
}

export const EMPTY_FUEL_CONSUMPTION_REPORT: FuelConsumptionReport = {
  items: [],
  total: 0,
  totalRecords: 0,
  totalLiters: 0,
  totalCost: 0,
  totalDistanceKm: 0,
  totalEfficiencyKmPerLiter: null,
};

export interface MaintenanceCostRow extends ConsolidatedRow {
  orders: number;
  preventive: number;
  corrective: number;
  totalCost: number;
  avgCost: number | null;
}

export interface MaintenanceCostReport {
  items: MaintenanceCostRow[];
  total: number;
  totalOrders: number;
  totalPreventive: number;
  totalCorrective: number;
  totalCost: number;
}

export const EMPTY_MAINTENANCE_COST_REPORT: MaintenanceCostReport = {
  items: [],
  total: 0,
  totalOrders: 0,
  totalPreventive: 0,
  totalCorrective: 0,
  totalCost: 0,
};

export interface MileageRow extends ConsolidatedRow {
  trips: number;
  closedTrips: number;
  distanceKm: number;
  avgDistanceKm: number | null;
}

export interface MileageReport {
  items: MileageRow[];
  total: number;
  totalTrips: number;
  totalClosedTrips: number;
  totalDistanceKm: number;
}

export const EMPTY_MILEAGE_REPORT: MileageReport = {
  items: [],
  total: 0,
  totalTrips: 0,
  totalClosedTrips: 0,
  totalDistanceKm: 0,
};

/// Celdas numéricas de los tres reportes: `—` cuando no hay valor, para no
/// mostrar un 0 que en realidad no se midió (un promedio sin denominador no es
/// cero). Se usan igual en la tabla y en el Excel/PDF, así el archivo dice lo
/// mismo que la pantalla.

export function decimalCell(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

export function moneyCell(value: number | null): string {
  return value === null ? '—' : `Bs. ${value.toFixed(2)}`;
}

export function intCell(value: number): string {
  return value.toLocaleString('es-BO');
}
