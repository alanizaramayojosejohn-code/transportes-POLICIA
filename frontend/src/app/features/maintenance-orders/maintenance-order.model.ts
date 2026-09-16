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
}

export interface FinishMaintenanceOrderInput {
  totalCost: number;
  finishedAt?: string;
  invoiceNumber?: string;
}
