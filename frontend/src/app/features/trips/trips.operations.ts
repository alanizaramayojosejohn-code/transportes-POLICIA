import { gql } from 'apollo-angular';
import { TripPage } from './trip.model';

/**
 * Documentos GraphQL de recorridos, fuera del servicio porque los comparten
 * dos consumidores: `TripsService` (lo que el usuario dispara) y
 * `TripOutboxService` (lo que se reenvía al volver la conexión). La cola no
 * puede inyectar `TripsService` —es `TripsService` el que encola— así que
 * manda las mutaciones por su cuenta con estos mismos documentos.
 */
const TRIP_FIELDS = `
  id
  departureAt
  departureOdometer
  departureFuelLevel
  departureConditionNotes
  returnAt
  returnOdometer
  returnFuelLevel
  returnConditionNotes
  damagesFound
  incidentNotes
  distanceKm
  destination
  vehicle {
    id
    plate
    currentUnit {
      id
      name
    }
  }
  driver {
    id
    firstName
    lastName
  }
`;

export const TRIPS_QUERY = gql`
  query Trips($vehicleId: String, $driverId: String, $open: Boolean, $search: String, $skip: Int, $take: Int) {
    trips(vehicleId: $vehicleId, driverId: $driverId, open: $open, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${TRIP_FIELDS}
      }
    }
  }
`;

export const CREATE_TRIP_MUTATION = gql`
  mutation CreateTrip($input: CreateTripInput!) {
    createTrip(input: $input) {
      ${TRIP_FIELDS}
    }
  }
`;

export const CLOSE_TRIP_MUTATION = gql`
  mutation CloseTrip($id: String!, $input: CloseTripInput!) {
    closeTrip(id: $id, input: $input) {
      ${TRIP_FIELDS}
    }
  }
`;

export interface TripsQueryResult {
  trips: TripPage;
}
