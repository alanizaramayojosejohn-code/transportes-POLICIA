import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { queryData } from '../../../core/graphql/query-data';
import { fetchAllPages } from '../../../shared/export/report-export';
import {
  EMPTY_FUEL_CONSUMPTION_REPORT,
  EMPTY_MAINTENANCE_COST_REPORT,
  EMPTY_MILEAGE_REPORT,
  FuelConsumptionReport,
  FuelConsumptionRow,
  MaintenanceCostReport,
  MaintenanceCostRow,
  MileageReport,
  MileageRow,
  ReportFilter,
} from './consolidated-report.model';

/// Los tres reportes reciben exactamente los mismos argumentos (spec 018), así
/// que la lista de variables se escribe una vez y se interpola en cada
/// consulta junto con la de campos del grupo.
const REPORT_VARS = `
  $vehicleId: String
  $unitId: String
  $vehicleType: VehicleType
  $groupBy: ReportGroupBy
  $fromDate: String
  $toDate: String
  $skip: Int
  $take: Int
`;

const REPORT_ARGS = `
  vehicleId: $vehicleId
  unitId: $unitId
  vehicleType: $vehicleType
  groupBy: $groupBy
  fromDate: $fromDate
  toDate: $toDate
  skip: $skip
  take: $take
`;

const GROUP_FIELDS = `
  groupId
  groupLabel
  groupDetail
  vehicleCount
`;

const FUEL_CONSUMPTION_QUERY = gql`
  query FuelConsumptionReport(${REPORT_VARS}) {
    fuelConsumptionReport(${REPORT_ARGS}) {
      total
      totalRecords
      totalLiters
      totalCost
      totalDistanceKm
      totalEfficiencyKmPerLiter
      items {
        ${GROUP_FIELDS}
        records
        liters
        totalCost
        avgUnitPrice
        distanceKm
        efficiencyKmPerLiter
      }
    }
  }
`;

const MAINTENANCE_COST_QUERY = gql`
  query MaintenanceCostReport(${REPORT_VARS}) {
    maintenanceCostReport(${REPORT_ARGS}) {
      total
      totalOrders
      totalPreventive
      totalCorrective
      totalCost
      items {
        ${GROUP_FIELDS}
        orders
        preventive
        corrective
        totalCost
        avgCost
      }
    }
  }
`;

const MILEAGE_QUERY = gql`
  query MileageReport(${REPORT_VARS}) {
    mileageReport(${REPORT_ARGS}) {
      total
      totalTrips
      totalClosedTrips
      totalDistanceKm
      items {
        ${GROUP_FIELDS}
        trips
        closedTrips
        distanceKm
        avgDistanceKm
      }
    }
  }
`;

interface FuelConsumptionResult {
  fuelConsumptionReport: FuelConsumptionReport;
}

interface MaintenanceCostResult {
  maintenanceCostReport: MaintenanceCostReport;
}

interface MileageResult {
  mileageReport: MileageReport;
}

/**
 * Los tres reportes consolidados de spec 018: consumo de combustible, costos
 * de mantenimiento y kilometraje recorrido. Son de sólo lectura y el backend
 * los agrupa (por vehículo o por unidad) y los totaliza; acá no se recalcula
 * nada, sólo se consulta.
 */
@Injectable({ providedIn: 'root' })
export class ConsolidatedReportsService {
  constructor(private readonly apollo: Apollo) {}

  fuelConsumption(filter: ReportFilter): Observable<FuelConsumptionReport> {
    return this.apollo
      .watchQuery<FuelConsumptionResult>({
        query: FUEL_CONSUMPTION_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData(
          (data: FuelConsumptionResult) => data.fuelConsumptionReport,
          EMPTY_FUEL_CONSUMPTION_REPORT,
        ),
      );
  }

  maintenanceCost(filter: ReportFilter): Observable<MaintenanceCostReport> {
    return this.apollo
      .watchQuery<MaintenanceCostResult>({
        query: MAINTENANCE_COST_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData(
          (data: MaintenanceCostResult) => data.maintenanceCostReport,
          EMPTY_MAINTENANCE_COST_REPORT,
        ),
      );
  }

  mileage(filter: ReportFilter): Observable<MileageReport> {
    return this.apollo
      .watchQuery<MileageResult>({
        query: MILEAGE_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: MileageResult) => data.mileageReport, EMPTY_MILEAGE_REPORT),
      );
  }

  /// Para exportar: todas las filas del resultado filtrado, no sólo la página
  /// visible. `query()`, nunca `watchQuery()` + `firstValueFrom` (ver
  /// `vehicle-photos.service.ts`: esa combinación aborta la petición).
  listAllFuelConsumption(filter: ReportFilter): Promise<FuelConsumptionRow[]> {
    return this.fetchAll(
      FUEL_CONSUMPTION_QUERY,
      filter,
      (data: FuelConsumptionResult) => data.fuelConsumptionReport,
    );
  }

  listAllMaintenanceCost(filter: ReportFilter): Promise<MaintenanceCostRow[]> {
    return this.fetchAll(
      MAINTENANCE_COST_QUERY,
      filter,
      (data: MaintenanceCostResult) => data.maintenanceCostReport,
    );
  }

  listAllMileage(filter: ReportFilter): Promise<MileageRow[]> {
    return this.fetchAll(MILEAGE_QUERY, filter, (data: MileageResult) => data.mileageReport);
  }

  private fetchAll<TData, TRow>(
    query: typeof FUEL_CONSUMPTION_QUERY,
    filter: ReportFilter,
    select: (data: TData) => { items: TRow[]; total: number },
  ): Promise<TRow[]> {
    return fetchAllPages((skip, take) =>
      firstValueFrom(
        this.apollo.query<TData>({
          query,
          variables: { ...filter, skip, take },
          fetchPolicy: 'network-only',
        }),
      ).then((result) =>
        result.data === undefined ? { items: [], total: 0 } : select(result.data as TData),
      ),
    );
  }
}
