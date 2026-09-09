export interface UnitAssignment {
  id: string;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  referenceDocument: string | null;
  notes: string | null;
  vehicle: { id: string; plate: string };
  unit: { id: string; name: string };
}

export interface UnitAssignmentPage {
  items: UnitAssignment[];
  total: number;
}

export interface UnitAssignmentFilter {
  unitId?: string;
  current?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateUnitAssignmentInput {
  vehicleId: string;
  unitId: string;
  startDate: string;
  reason?: string;
  referenceDocument?: string;
  notes?: string;
}

export interface CloseUnitAssignmentInput {
  vehicleId: string;
  endDate: string;
}

export interface UpdateUnitAssignmentNotesInput {
  vehicleId: string;
  reason?: string;
  referenceDocument?: string;
  notes?: string;
}
