export interface TransportManagerAssignment {
  id: string;
  startDate: string;
  endDate: string | null;
  referenceDocument: string | null;
  notes: string | null;
  officer: { id: string; firstName: string; lastName: string; rank: string | null };
}

export interface Unit {
  id: string;
  code: string | null;
  name: string;
  type: string | null;
  location: string | null;
  isActive: boolean;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; isActive: boolean }[];
  currentManager: TransportManagerAssignment | null;
  managerHistory: TransportManagerAssignment[];
  activeVehicleCount: number;
}

export interface UnitOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface UnitPage {
  items: Unit[];
  total: number;
}

export interface UnitFilter {
  isActive?: boolean;
  parentId?: string;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateUnitInput {
  code?: string;
  name: string;
  type?: string;
  location?: string;
  parentId?: string;
}

export type UpdateUnitInput = Partial<CreateUnitInput>;

export interface Officer {
  id: string;
  ci: string;
  ciComplement: string;
  firstName: string;
  lastName: string;
  rank: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  currentUnit: { id: string; name: string } | null;
}

export interface OfficerPage {
  items: Officer[];
  total: number;
}

export interface OfficerFilter {
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateOfficerInput {
  ci: string;
  ciComplement?: string;
  firstName: string;
  lastName: string;
  rank?: string;
  phone?: string;
  email?: string;
  currentUnitId?: string;
}

export type UpdateOfficerInput = Partial<CreateOfficerInput>;

export interface AssignTransportManagerInput {
  unitId: string;
  officerId: string;
  startDate: string;
  referenceDocument?: string;
  notes?: string;
}

export interface CloseTransportManagerAssignmentInput {
  unitId: string;
  endDate: string;
}
