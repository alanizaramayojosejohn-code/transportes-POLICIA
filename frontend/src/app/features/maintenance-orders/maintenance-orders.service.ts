import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { queryData } from '../../core/graphql/query-data';
import { fetchAllPages } from '../../shared/export/report-export';
import {
  CreateMaintenanceOrderInput,
  FinishMaintenanceOrderInput,
  MaintenanceOrder,
  MaintenanceOrderFilter,
  MaintenanceOrderPage,
} from './maintenance-order.model';

const MAINTENANCE_ORDER_FIELDS = `
  id
  code
  type
  status
  description
  workshopName
  odometer
  startedAt
  finishedAt
  totalCost
  invoiceNumber
  vehicle {
    id
    plate
  }
  procedureChecklistItems {
    id
    completed
    documentCode
    procedureTypeId
    procedureType {
      id
      name
    }
  }
`;

const MAINTENANCE_ORDERS_QUERY = gql`
  query MaintenanceOrders($vehicleId: String, $type: MaintenanceType, $status: MaintenanceStatus, $search: String, $skip: Int, $take: Int) {
    maintenanceOrders(vehicleId: $vehicleId, type: $type, status: $status, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${MAINTENANCE_ORDER_FIELDS}
      }
    }
  }
`;

const CREATE_MAINTENANCE_ORDER_MUTATION = gql`
  mutation CreateMaintenanceOrder($input: CreateMaintenanceOrderInput!) {
    createMaintenanceOrder(input: $input) {
      ${MAINTENANCE_ORDER_FIELDS}
    }
  }
`;

const FINISH_MAINTENANCE_ORDER_MUTATION = gql`
  mutation FinishMaintenanceOrder($id: String!, $input: FinishMaintenanceOrderInput!) {
    finishMaintenanceOrder(id: $id, input: $input) {
      ${MAINTENANCE_ORDER_FIELDS}
    }
  }
`;

interface MaintenanceOrdersQueryResult {
  maintenanceOrders: MaintenanceOrderPage;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceOrdersService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: MaintenanceOrderFilter): Observable<MaintenanceOrderPage> {
    return this.apollo
      .watchQuery<MaintenanceOrdersQueryResult>({
        query: MAINTENANCE_ORDERS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: MaintenanceOrdersQueryResult) => data.maintenanceOrders, {
          items: [],
          total: 0,
        }),
      );
  }

  /// Para exportar: todo el resultado filtrado, no sólo la página actual.
  async listAll(
    filter: Omit<MaintenanceOrderFilter, 'skip' | 'take'>,
  ): Promise<MaintenanceOrder[]> {
    return fetchAllPages((skip, take) =>
      firstValueFrom(
        this.apollo.query<MaintenanceOrdersQueryResult>({
          query: MAINTENANCE_ORDERS_QUERY,
          variables: { ...filter, skip, take },
          fetchPolicy: 'network-only',
        }),
      ).then((result) => result.data?.maintenanceOrders ?? { items: [], total: 0 }),
    );
  }

  async create(input: CreateMaintenanceOrderInput): Promise<MaintenanceOrder> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createMaintenanceOrder: MaintenanceOrder }>({
        mutation: CREATE_MAINTENANCE_ORDER_MUTATION,
        variables: { input },
        refetchQueries: ['MaintenanceOrders'],
      }),
    );
    return result.data!.createMaintenanceOrder;
  }

  async finish(id: string, input: FinishMaintenanceOrderInput): Promise<MaintenanceOrder> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ finishMaintenanceOrder: MaintenanceOrder }>({
        mutation: FINISH_MAINTENANCE_ORDER_MUTATION,
        variables: { id, input },
        refetchQueries: ['MaintenanceOrders'],
      }),
    );
    return result.data!.finishMaintenanceOrder;
  }
}
