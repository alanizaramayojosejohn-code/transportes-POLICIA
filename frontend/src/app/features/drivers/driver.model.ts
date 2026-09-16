export interface DriverUnit {
  id: string;
  name: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  rank: string | null;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiresAt: string;
  phone: string | null;
  isActive: boolean;
  unitId: string | null;
  unit: DriverUnit | null;
}

export interface DriverPage {
  items: Driver[];
  total: number;
}

export interface DriverFilter {
  unitId?: string;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  ci: string;
  rank?: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiresAt: string;
  phone?: string;
  unitId?: string;
}

export type UpdateDriverInput = Partial<CreateDriverInput>;
