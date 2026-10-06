import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { queryData } from '../../core/graphql/query-data';
import { DashboardSummary } from './dashboard.model';

const DASHBOARD_SUMMARY_QUERY = gql`
  query DashboardSummary {
    dashboardSummary {
      vehicleCount
      operationalVehicleCount
      activeDriverCount
      tripsThisMonthCount
      openTripsCount
      lowStockCount
      inProgressMaintenanceCount
      tripsByMonth {
        month
        count
      }
      fleetStatus {
        operational
        maintenance
        inoperable
        other
      }
    }
  }
`;

interface DashboardSummaryResult {
  dashboardSummary: DashboardSummary;
}

const EMPTY_SUMMARY: DashboardSummary = {
  vehicleCount: 0,
  operationalVehicleCount: 0,
  activeDriverCount: 0,
  tripsThisMonthCount: 0,
  openTripsCount: 0,
  lowStockCount: 0,
  inProgressMaintenanceCount: 0,
  tripsByMonth: [],
  fleetStatus: { operational: 0, maintenance: 0, inoperable: 0, other: 0 },
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly apollo: Apollo) {}

  getSummary(): Observable<DashboardSummary> {
    return this.apollo
      .watchQuery<DashboardSummaryResult>({
        query: DASHBOARD_SUMMARY_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: DashboardSummaryResult) => data.dashboardSummary, EMPTY_SUMMARY),
      );
  }
}
