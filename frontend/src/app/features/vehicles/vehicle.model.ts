import {
  ProcedureChecklistItem,
  ProcedureChecklistItemDraft,
} from '../procedure-types/procedure-type.model';

export type VehicleType =
  'AUTOMOVIL' | 'CAMIONETA' | 'MOTOCICLETA' | 'MINIBUS' | 'CAMION' | 'AMBULANCIA' | 'OTRO';

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  AUTOMOVIL: 'Automóvil',
  CAMIONETA: 'Camioneta',
  MOTOCICLETA: 'Motocicleta',
  MINIBUS: 'Minibús',
  CAMION: 'Camión',
  AMBULANCIA: 'Ambulancia',
  OTRO: 'Otro',
};

export type VehicleConditionCode =
  | 'BUENO'
  | 'REGULAR'
  | 'DETERIORADO'
  | 'FUERA_DE_USO'
  | 'INOPERABLE'
  | 'EXTRAVIADO'
  | 'DEVUELTO'
  | 'BAJA'
  | 'SEPARADO_POR_INCIDENTE';

export const VEHICLE_CONDITION_LABEL: Record<VehicleConditionCode, string> = {
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  DETERIORADO: 'Deteriorado',
  FUERA_DE_USO: 'Fuera de uso',
  INOPERABLE: 'Inoperable',
  EXTRAVIADO: 'Extraviado',
  DEVUELTO: 'Devuelto',
  BAJA: 'Dado de baja',
  SEPARADO_POR_INCIDENTE: 'Separado por incidente',
};

/** Colores de badge por condición, siguiendo la paleta del diseño (spec 001). */
export const VEHICLE_CONDITION_BADGE: Record<VehicleConditionCode, 'green' | 'amber' | 'red'> = {
  BUENO: 'green',
  REGULAR: 'amber',
  DETERIORADO: 'amber',
  FUERA_DE_USO: 'red',
  INOPERABLE: 'red',
  EXTRAVIADO: 'red',
  DEVUELTO: 'amber',
  BAJA: 'red',
  SEPARADO_POR_INCIDENTE: 'red',
};

export interface VehicleCondition {
  id: string;
  code: VehicleConditionCode;
  reason: string | null;
  registeredByRole: string | null;
  changedAt: string;
}

export interface UnitAssignmentSummary {
  id: string;
  startDate: string;
  endDate: string | null;
  unit: { id: string; name: string };
}

export interface VehicleDriverSummary {
  id: string;
  firstName: string;
  lastName: string;
  rank: string | null;
}

export interface DriverAssignmentSummary {
  id: string;
  startDate: string;
  endDate: string | null;
  driver: VehicleDriverSummary;
}

export interface VehicleCurrentUnit {
  id: string;
  name: string;
  currentManager: { officer: VehicleDriverSummary } | null;
}

export interface Vehicle {
  id: string;
  plate: string;
  plateDnfr: string | null;
  type: VehicleType;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  chassisNumber: string | null;
  engineNumber: string | null;
  origin: string | null;
  receptionSource: string | null;
  observations: string | null;
  isActive: boolean;
  createdAt: string;
  currentCondition: VehicleCondition | null;
  conditionHistory: VehicleCondition[];
  currentUnit: VehicleCurrentUnit | null;
  unitAssignmentHistory: UnitAssignmentSummary[];
  /// Conductor encargado vigente (spec 014).
  currentDriver: VehicleDriverSummary | null;
  driverAssignmentHistory: DriverAssignmentSummary[];
  /// Mayor kilometraje conocido entre recorridos, combustible y lecturas
  /// sueltas (spec 014); null si el vehículo no tiene ninguna todavía.
  lastOdometer: number | null;
  /// Checklist de trámites de su registro (spec 016, RF-17).
  procedureChecklistItems: ProcedureChecklistItem[];
}

export interface VehiclePage {
  items: Vehicle[];
  total: number;
}

export interface VehicleFilter {
  condition?: VehicleConditionCode;
  unitId?: string;
  type?: VehicleType;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateVehicleInput {
  plate: string;
  plateDnfr?: string;
  type: VehicleType;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  chassisNumber?: string;
  engineNumber?: string;
  origin?: string;
  receptionSource?: string;
  observations?: string;
  /// Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar.
  checklistItems?: ProcedureChecklistItemDraft[];
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export interface RegisterVehicleConditionInput {
  code: VehicleConditionCode;
  reason?: string;
}

export interface VehiclePhoto {
  id: string;
  slotKey: string;
  dataUrl: string;
  vehicleId: string;
}

export interface SetVehiclePhotoInput {
  vehicleId: string;
  slotKey: string;
  dataUrl: string;
}
