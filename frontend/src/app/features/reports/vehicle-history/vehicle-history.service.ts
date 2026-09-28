import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { VehicleHistoryFilter, VehicleHistoryPage } from './vehicle-history.model';

const VEHICLE_HISTORY_QUERY = gql`
  query VehicleHistory(
    $vehicleId: String
    $types: [VehicleHistoryEntryType!]
    $fromDate: String
    $toDate: String
    $skip: Int
    $take: Int
  ) {
    vehicleHistory(
      vehicleId: $vehicleId
      types: $types
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
        unitName
        destination
        returnAt
        distanceKm
        fuelType
        station
        quantity
        amount
        maintenanceType
        maintenanceStatus
        workshopName
        incidentType
        incidentSeverity
        place
        stockMovementType
        sparePartName
        description
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

interface VehicleHistoryQueryResult {
  vehicleHistory: VehicleHistoryPage;
}

/** Reporte «Historial integral del vehículo» (spec 018, RF-12 a RF-17). */
@Injectable({ providedIn: 'root' })
export class VehicleHistoryService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: VehicleHistoryFilter): Observable<VehicleHistoryPage> {
    return this.apollo
      .watchQuery<VehicleHistoryQueryResult>({
        query: VEHICLE_HISTORY_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map(
          (result) =>
            (result.data?.vehicleHistory as VehicleHistoryPage) ?? { items: [], total: 0 },
        ),
      );
  }
}
