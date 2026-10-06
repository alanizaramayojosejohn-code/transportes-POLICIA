export type ProcedureAction =
  'VEHICLE_REGISTRATION' | 'FUEL_VOUCHER' | 'SPARE_PART_DELIVERY' | 'MAINTENANCE_ORDER';

export const PROCEDURE_ACTION_LABELS: Record<ProcedureAction, string> = {
  VEHICLE_REGISTRATION: 'Registrar vehículo',
  FUEL_VOUCHER: 'Vale de combustible',
  SPARE_PART_DELIVERY: 'Entrega de refacciones',
  MAINTENANCE_ORDER: 'Orden de mantenimiento',
};

export const PROCEDURE_ACTIONS: ProcedureAction[] = [
  'VEHICLE_REGISTRATION',
  'FUEL_VOUCHER',
  'SPARE_PART_DELIVERY',
  'MAINTENANCE_ORDER',
];

export interface ProcedureType {
  id: string;
  name: string;
  description: string | null;
  action: ProcedureAction;
  isActive: boolean;
}

export interface ProcedureTypePage {
  items: ProcedureType[];
  total: number;
}

export interface ProcedureTypeFilter {
  action?: ProcedureAction;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateProcedureTypeInput {
  name: string;
  description?: string;
  action: ProcedureAction;
}

export interface UpdateProcedureTypeInput {
  name?: string;
  description?: string;
}

/** Ítem de checklist ya guardado en un registro (spec 016, RF-17). */
export interface ProcedureChecklistItem {
  id: string;
  completed: boolean;
  documentCode: string | null;
  procedureTypeId: string;
  procedureType: { id: string; name: string };
}

/** Ítem que se envía al registrar la acción (RF-9/RF-10), antes de existir. */
export interface ProcedureChecklistItemDraft {
  procedureTypeId: string;
  completed: boolean;
  documentCode?: string;
}

/** Ítem que se envía al completar el checklist después del alta (RF-15). */
export interface UpdateProcedureChecklistItemInput {
  id: string;
  completed: boolean;
  documentCode?: string;
}
