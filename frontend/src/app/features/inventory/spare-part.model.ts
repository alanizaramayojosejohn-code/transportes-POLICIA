import { ProcedureChecklistItemDraft } from '../procedure-types/procedure-type.model';

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export const STOCK_MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  ADJUSTMENT: 'Ajuste',
};

export type SparePartType = 'LIQUIDO' | 'LLANTA' | 'PIEZA' | 'OTRO';

export const SPARE_PART_TYPE_LABELS: Record<SparePartType, string> = {
  LIQUIDO: 'Líquido',
  LLANTA: 'Llanta',
  PIEZA: 'Pieza',
  OTRO: 'Otro',
};

export interface SparePartCategory {
  id: string;
  name: string;
}

export interface SparePart {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: SparePartType;
  tireSize: string | null;
  weight: number | null;
  unit: string;
  minStock: number;
  currentStock: number;
  lastUnitCost: number | null;
  location: string | null;
  isActive: boolean;
  categoryId: string | null;
  category: SparePartCategory | null;
}

export interface SparePartPage {
  items: SparePart[];
  total: number;
}

export interface SparePartFilter {
  categoryId?: string;
  type?: SparePartType;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateSparePartInput {
  code: string;
  name: string;
  categoryId: string;
  type?: SparePartType;
  tireSize?: string;
  weight?: number;
  unit: string;
  minStock?: number;
  location?: string;
  description?: string;
}

export type UpdateSparePartInput = Partial<CreateSparePartInput>;

export interface CreateStockMovementInput {
  sparePartId: string;
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  reason?: string;
  supplier?: string;
  reference?: string;
  lotNumber?: string;
  lotExpiresAt?: string;
  vehicleId?: string;
  /// Spec 016 RF-11/RF-12: orden de mantenimiento relacionada, sólo en salida.
  maintenanceOrderId?: string;
  /// Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar.
  checklistItems?: ProcedureChecklistItemDraft[];
}

/** Reporte «Movimientos de almacén» (spec 018): no existía como listado propio. */
export interface StockMovementSparePart {
  id: string;
  code: string;
  name: string;
  unit: string;
}

export interface StockMovementVehicle {
  id: string;
  plate: string;
}

export interface StockMovementOrder {
  id: string;
  code: string;
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  unitCost: number | null;
  balanceAfter: number;
  reason: string | null;
  supplier: string | null;
  reference: string | null;
  lotNumber: string | null;
  lotExpiresAt: string | null;
  createdAt: string;
  sparePart: StockMovementSparePart;
  vehicle: StockMovementVehicle | null;
  maintenanceOrder: StockMovementOrder | null;
}

export interface StockMovementPage {
  items: StockMovement[];
  total: number;
}

export interface StockMovementFilter {
  sparePartId?: string;
  vehicleId?: string;
  type?: StockMovementType;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
}
