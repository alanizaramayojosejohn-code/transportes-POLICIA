import { BadgeTone } from '../../shared/badge/badge.component';
import {
  ProcedureChecklistItem,
  ProcedureChecklistItemDraft,
} from '../procedure-types/procedure-type.model';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const MAINTENANCE_TYPES: MaintenanceType[] = ['PREVENTIVE', 'CORRECTIVE'];

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

/** Color de la insignia de estado, compartido por el listado y la ficha. */
export const MAINTENANCE_STATUS_TONE: Record<MaintenanceStatus, BadgeTone> = {
  SCHEDULED: 'amber',
  IN_PROGRESS: 'amber',
  COMPLETED: 'gray',
  CANCELLED: 'red',
};

export interface MaintenanceOrderVehicle {
  id: string;
  plate: string;
}

export interface MaintenanceOrder {
  id: string;
  code: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  workshopName: string | null;
  odometer: number;
  startedAt: string | null;
  finishedAt: string | null;
  totalCost: number;
  invoiceNumber: string | null;
  vehicle: MaintenanceOrderVehicle;
  /// Checklist de trámites de su registro (spec 016, RF-17).
  procedureChecklistItems: ProcedureChecklistItem[];
}

export interface MaintenanceOrderPage {
  items: MaintenanceOrder[];
  total: number;
}

export interface MaintenanceOrderFilter {
  vehicleId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateMaintenanceOrderInput {
  vehicleId: string;
  type: MaintenanceType;
  workshopName?: string;
  odometer: number;
  startedAt?: string;
  description: string;
  invoiceNumber?: string;
  /// Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar.
  checklistItems?: ProcedureChecklistItemDraft[];
}

export interface FinishMaintenanceOrderInput {
  totalCost: number;
  finishedAt?: string;
  invoiceNumber?: string;
}
