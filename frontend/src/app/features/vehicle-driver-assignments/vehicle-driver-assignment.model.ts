export interface AssignVehicleDriverInput {
  vehicleId: string;
  driverId: string;
  startDate: string;
  referenceDocument?: string;
  notes?: string;
}

export interface CloseVehicleDriverAssignmentInput {
  vehicleId: string;
  endDate: string;
}

export interface MyVehicleAssignmentManager {
  id: string;
  firstName: string;
  lastName: string;
  rank: string | null;
}

export interface MyVehicleAssignment {
  id: string;
  startDate: string;
  vehicleId: string;
  driverId: string;
  vehicle: {
    id: string;
    plate: string;
    lastOdometer: number | null;
    currentUnit: {
      id: string;
      name: string;
      currentManager: { officer: MyVehicleAssignmentManager } | null;
    } | null;
  };
}
