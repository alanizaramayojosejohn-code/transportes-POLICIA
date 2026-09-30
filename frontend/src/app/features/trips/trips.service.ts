import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { queryData } from '../../core/graphql/query-data';
import { fetchAllPages } from '../../shared/export/report-export';
import { CloseTripInput, CreateTripInput, Trip, TripFilter, TripPage } from './trip.model';

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

const TRIPS_QUERY = gql`
  query Trips($vehicleId: String, $driverId: String, $open: Boolean, $search: String, $skip: Int, $take: Int) {
    trips(vehicleId: $vehicleId, driverId: $driverId, open: $open, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${TRIP_FIELDS}
      }
    }
  }
`;

const CREATE_TRIP_MUTATION = gql`
  mutation CreateTrip($input: CreateTripInput!) {
    createTrip(input: $input) {
      ${TRIP_FIELDS}
    }
  }
`;

const CLOSE_TRIP_MUTATION = gql`
  mutation CloseTrip($id: String!, $input: CloseTripInput!) {
    closeTrip(id: $id, input: $input) {
      ${TRIP_FIELDS}
    }
  }
`;

interface TripsQueryResult {
  trips: TripPage;
}

@Injectable({ providedIn: 'root' })
export class TripsService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: TripFilter): Observable<TripPage> {
    return this.apollo
      .watchQuery<TripsQueryResult>({
        query: TRIPS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: TripsQueryResult) => data.trips, { items: [], total: 0 }),
      );
  }

  /// Para exportar: todo el resultado filtrado, no sólo la página actual.
  async listAll(filter: Omit<TripFilter, 'skip' | 'take'>): Promise<Trip[]> {
    return fetchAllPages((skip, take) =>
      firstValueFrom(
        this.apollo.query<TripsQueryResult>({
          query: TRIPS_QUERY,
          variables: { ...filter, skip, take },
          fetchPolicy: 'network-only',
        }),
      ).then((result) => result.data?.trips ?? { items: [], total: 0 }),
    );
  }

  async create(input: CreateTripInput): Promise<Trip> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createTrip: Trip }>({
        mutation: CREATE_TRIP_MUTATION,
        variables: { input },
        refetchQueries: ['Trips'],
      }),
    );
    return result.data!.createTrip;
  }

  async close(id: string, input: CloseTripInput): Promise<Trip> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ closeTrip: Trip }>({
        mutation: CLOSE_TRIP_MUTATION,
        variables: { id, input },
        refetchQueries: ['Trips'],
      }),
    );
    return result.data!.closeTrip;
  }
}
