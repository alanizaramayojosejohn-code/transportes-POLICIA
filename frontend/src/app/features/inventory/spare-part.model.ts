export type StockMovementType = 'IN' | 'OUT';

export interface SparePartCategory {
  id: string;
  name: string;
}

export interface SparePart {
  id: string;
  code: string;
  name: string;
  description: string | null;
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
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateSparePartInput {
  code: string;
  name: string;
  categoryId: string;
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
}
