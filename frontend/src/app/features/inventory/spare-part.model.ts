export type StockMovementType = 'IN' | 'OUT';

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
}
