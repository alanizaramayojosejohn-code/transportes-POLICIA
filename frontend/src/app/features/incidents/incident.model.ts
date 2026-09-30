import { VehicleConditionCode } from '../vehicles/vehicle.model';

export type IncidentType = 'ACCIDENTE' | 'AVERIA' | 'ROBO' | 'INFRACCION' | 'OTRO';

export const INCIDENT_TYPES: IncidentType[] = ['ACCIDENTE', 'AVERIA', 'ROBO', 'INFRACCION', 'OTRO'];

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  ACCIDENTE: 'Accidente de tránsito',
  AVERIA: 'Avería',
  ROBO: 'Robo',
  INFRACCION: 'Infracción',
  OTRO: 'Otro',
};

export interface IncidentVehicle {
  id: string;
  plate: string;
  /// Unidad actual del vehículo, para la ficha del incidente (ver `TripVehicle`).
  currentUnit: { id: string; name: string } | null;
}

export interface IncidentDriver {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Incident {
  id: string;
  code: string;
  type: IncidentType;
  occurredAt: string;
  place: string;
  description: string;
  damages: string | null;
  policeReportNumber: string | null;
  vehicle: IncidentVehicle;
  driver: IncidentDriver | null;
}

export interface IncidentPage {
  items: Incident[];
  total: number;
}

export interface IncidentFilter {
  vehicleId?: string;
  type?: IncidentType;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateIncidentInput {
  vehicleId: string;
  driverId?: string;
  type: IncidentType;
  occurredAt: string;
  place: string;
  description: string;
  damages?: string;
  policeReportNumber?: string;
  postCondition?: VehicleConditionCode;
}
