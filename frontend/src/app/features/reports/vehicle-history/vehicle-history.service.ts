import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { queryData } from '../../../core/graphql/query-data';
import { fetchAllPages } from '../../../shared/export/report-export';
import {
  VehicleHistoryEntry,
  VehicleHistoryFilter,
  VehicleHistoryPage,
} from './vehicle-history.model';

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
        queryData((data: VehicleHistoryQueryResult) => data.vehicleHistory, {
          items: [],
          total: 0,
        }),
      );
  }

  /// Para exportar: todo el resultado filtrado, no sólo la página actual.
  async listAll(
    filter: Omit<VehicleHistoryFilter, 'skip' | 'take'>,
  ): Promise<VehicleHistoryEntry[]> {
    return fetchAllPages((skip, take) =>
      firstValueFrom(
        this.apollo.query<VehicleHistoryQueryResult>({
          query: VEHICLE_HISTORY_QUERY,
          variables: { ...filter, skip, take },
          fetchPolicy: 'network-only',
        }),
      ).then((result) => result.data?.vehicleHistory ?? { items: [], total: 0 }),
    );
  }
}
