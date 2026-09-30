import {
  ProcedureChecklistItem,
  ProcedureChecklistItemDraft,
} from '../procedure-types/procedure-type.model';

export type FuelType = 'GASOLINA' | 'DIESEL' | 'GNV' | 'ELECTRICO';

export const FUEL_TYPES: FuelType[] = ['GASOLINA', 'DIESEL', 'GNV', 'ELECTRICO'];

export const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  GASOLINA: 'Gasolina',
  DIESEL: 'Diésel',
  GNV: 'GNV',
  ELECTRICO: 'Eléctrico',
};

export interface FuelRecordVehicle {
  id: string;
  plate: string;
  /// Unidad actual del vehículo, para la ficha del abastecimiento (ver `TripVehicle`).
  currentUnit: { id: string; name: string } | null;
}

export interface FuelRecordDriver {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FuelRecord {
  id: string;
  suppliedAt: string;
  fuelType: FuelType;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  station: string | null;
  ticketNumber: string | null;
  odometer: number;
  efficiencyKmPerUnit: number | null;
  notes: string | null;
  vehicle: FuelRecordVehicle;
  driver: FuelRecordDriver | null;
  /// Checklist de trámites de su registro (spec 016, RF-17).
  procedureChecklistItems: ProcedureChecklistItem[];
}

export interface FuelRecordPage {
  items: FuelRecord[];
  total: number;
}

export interface FuelRecordFilter {
  vehicleId?: string;
  fuelType?: FuelType;
  fromDate?: string;
  toDate?: string;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateFuelRecordInput {
  vehicleId: string;
  driverId?: string;
  suppliedAt: string;
  fuelType: FuelType;
  quantity: number;
  unitPrice: number;
  station?: string;
  ticketNumber?: string;
  odometer: number;
  notes?: string;
  /// Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar.
  checklistItems?: ProcedureChecklistItemDraft[];
}
