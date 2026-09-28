import { FuelType } from '../../fuel-records/fuel-record.model';
import {
  MaintenanceStatus,
  MaintenanceType,
} from '../../maintenance-orders/maintenance-order.model';
import { IncidentType } from '../../incidents/incident.model';
import { StockMovementType } from '../../inventory/spare-part.model';

export type VehicleHistoryEntryType =
  | 'UNIT_ASSIGNMENT'
  | 'DRIVER_ASSIGNMENT'
  | 'TRIP'
  | 'FUEL'
  | 'MAINTENANCE'
  | 'INCIDENT'
  | 'STOCK_MOVEMENT';

export const VEHICLE_HISTORY_ENTRY_TYPES: VehicleHistoryEntryType[] = [
  'UNIT_ASSIGNMENT',
  'DRIVER_ASSIGNMENT',
  'TRIP',
  'FUEL',
  'MAINTENANCE',
  'INCIDENT',
  'STOCK_MOVEMENT',
];

export const VEHICLE_HISTORY_ENTRY_TYPE_LABEL: Record<VehicleHistoryEntryType, string> = {
  UNIT_ASSIGNMENT: 'Cambio de unidad',
  DRIVER_ASSIGNMENT: 'Cambio de conductor',
  TRIP: 'Recorrido',
  FUEL: 'Combustible',
  MAINTENANCE: 'Mantenimiento',
  INCIDENT: 'Incidente',
  STOCK_MOVEMENT: 'Movimiento de almacén',
};

/** Spec 018: sin spec propia todavía en Incidentes, se define aquí. */
export type IncidentSeverity = 'MINOR' | 'MODERATE' | 'SEVERE';

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  MINOR: 'Leve',
  MODERATE: 'Moderado',
  SEVERE: 'Grave',
};

export interface VehicleHistoryDriver {
  id: string;
  firstName: string;
  lastName: string;
  rank: string | null;
}

/** Fila unificada del historial integral del vehículo (spec 018, RF-12 a RF-17). */
export interface VehicleHistoryEntry {
  id: string;
  type: VehicleHistoryEntryType;
  occurredAt: string;
  driver: VehicleHistoryDriver | null;
  unitName: string | null;
  destination: string | null;
  returnAt: string | null;
  distanceKm: number | null;
  fuelType: FuelType | null;
  station: string | null;
  quantity: number | null;
  amount: number | null;
  maintenanceType: MaintenanceType | null;
  maintenanceStatus: MaintenanceStatus | null;
  workshopName: string | null;
  incidentType: IncidentType | null;
  incidentSeverity: IncidentSeverity | null;
  place: string | null;
  stockMovementType: StockMovementType | null;
  sparePartName: string | null;
  description: string | null;
}

export interface VehicleHistoryPage {
  items: VehicleHistoryEntry[];
  total: number;
}

export interface VehicleHistoryFilter {
  vehicleId?: string;
  types?: VehicleHistoryEntryType[];
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
}
