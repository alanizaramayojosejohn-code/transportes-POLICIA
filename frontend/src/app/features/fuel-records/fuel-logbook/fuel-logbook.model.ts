import { FuelType } from '../fuel-record.model';
import { VehicleType } from '../../vehicles/vehicle.model';

export type LogbookEntryType = 'TRIP' | 'FUEL';

export const LOGBOOK_ENTRY_TYPE_LABEL: Record<LogbookEntryType, string> = {
  TRIP: 'Recorrido',
  FUEL: 'Carga de combustible',
};

export interface LogbookVehicle {
  id: string;
  plate: string;
  type: VehicleType;
  currentUnit: { id: string; name: string } | null;
}

export interface LogbookDriver {
  id: string;
  firstName: string;
  lastName: string;
  rank: string | null;
}

/** Fila unificada de recorridos y cargas de combustible (bitácora de conductores). */
export interface LogbookEntry {
  id: string;
  type: LogbookEntryType;
  occurredAt: string;
  vehicle: LogbookVehicle;
  driver: LogbookDriver | null;
  /// Sólo recorridos.
  destination: string | null;
  returnAt: string | null;
  distanceKm: number | null;
  departureOdometer: number | null;
  returnOdometer: number | null;
  /// Sólo cargas de combustible.
  fuelType: FuelType | null;
  quantity: number | null;
  totalCost: number | null;
  station: string | null;
  odometer: number | null;
}

export interface LogbookPage {
  items: LogbookEntry[];
  total: number;
}

export interface LogbookFilter {
  driverId?: string;
  unitId?: string;
  vehicleType?: VehicleType;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
}
