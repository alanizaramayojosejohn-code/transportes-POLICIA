export interface MonthlyTripCount {
  month: string;
  count: number;
}

export interface FleetStatusBreakdown {
  operational: number;
  maintenance: number;
  inoperable: number;
  other: number;
}

export interface DashboardSummary {
  vehicleCount: number;
  operationalVehicleCount: number;
  activeDriverCount: number;
  tripsThisMonthCount: number;
  openTripsCount: number;
  lowStockCount: number;
  inProgressMaintenanceCount: number;
  tripsByMonth: MonthlyTripCount[];
  fleetStatus: FleetStatusBreakdown;
}
