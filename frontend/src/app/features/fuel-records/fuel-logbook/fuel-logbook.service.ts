import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { LogbookFilter, LogbookPage } from './fuel-logbook.model';

const LOGBOOK_QUERY = gql`
  query DriverLogbook(
    $driverId: String
    $unitId: String
    $vehicleType: VehicleType
    $fromDate: String
    $toDate: String
    $skip: Int
    $take: Int
  ) {
    driverLogbook(
      driverId: $driverId
      unitId: $unitId
      vehicleType: $vehicleType
      fromDate: $fromDate
      toDate: $toDate
      skip: $skip
      take: $take
    ) {
      total
      items {
        id
        type
        occurredAt
        destination
        returnAt
        distanceKm
        departureOdometer
        returnOdometer
        fuelType
        quantity
        totalCost
        station
        odometer
        vehicle {
          id
          plate
          type
          currentUnit {
            id
            name
          }
        }
        driver {
          id
          firstName
          lastName
          rank
        }
      }
    }
  }
`;

interface LogbookQueryResult {
  driverLogbook: LogbookPage;
}

@Injectable({ providedIn: 'root' })
export class FuelLogbookService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: LogbookFilter): Observable<LogbookPage> {
    return this.apollo
      .watchQuery<LogbookQueryResult>({
        query: LOGBOOK_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.driverLogbook as LogbookPage) ?? { items: [], total: 0 }),
      );
  }
}
