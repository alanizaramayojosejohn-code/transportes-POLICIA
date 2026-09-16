export interface TripVehicle {
  id: string;
  plate: string;
}

export interface TripDriver {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Trip {
  id: string;
  departureAt: string;
  departureOdometer: number;
  departureFuelLevel: number | null;
  departureConditionNotes: string | null;
  returnAt: string | null;
  returnOdometer: number | null;
  returnFuelLevel: number | null;
  returnConditionNotes: string | null;
  damagesFound: string | null;
  incidentNotes: string | null;
  distanceKm: number | null;
  destination: string;
  vehicle: TripVehicle;
  driver: TripDriver;
}

export interface TripPage {
  items: Trip[];
  total: number;
}

export interface TripFilter {
  vehicleId?: string;
  driverId?: string;
  open?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateTripInput {
  vehicleId: string;
  driverId: string;
  destination: string;
  departureAt: string;
  departureOdometer: number;
  departureFuelLevel?: number;
  departureConditionNotes?: string;
}

export interface CloseTripInput {
  returnAt?: string;
  returnOdometer: number;
  returnFuelLevel?: number;
  returnConditionNotes?: string;
  damagesFound?: string;
  incidentNotes?: string;
}
