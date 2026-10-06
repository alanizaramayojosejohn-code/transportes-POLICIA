import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import { queryData } from '../../core/graphql/query-data';
import { fetchAllPages } from '../../shared/export/report-export';
import {
  CreateVehicleInput,
  RegisterVehicleConditionInput,
  UpdateVehicleInput,
  Vehicle,
  VehicleFilter,
  VehiclePage,
} from './vehicle.model';

const VEHICLE_FIELDS = `
  id
  plate
  plateDnfr
  type
  brand
  model
  year
  color
  chassisNumber
  engineNumber
  origin
  receptionSource
  observations
  isActive
  createdAt
  currentCondition {
    id
    code
    reason
    registeredByRole
    changedAt
  }
  currentUnit {
    id
    name
    currentManager {
      officer {
        id
        firstName
        lastName
        rank
      }
    }
  }
  currentDriver {
    id
    firstName
    lastName
    rank
  }
  lastOdometer
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

const VEHICLES_QUERY = gql`
  query Vehicles(
    $condition: VehicleConditionCode
    $unitId: String
    $type: VehicleType
    $search: String
    $skip: Int
    $take: Int
  ) {
    vehicles(
      condition: $condition
      unitId: $unitId
      type: $type
      search: $search
      skip: $skip
      take: $take
    ) {
      total
      items {
        ${VEHICLE_FIELDS}
      }
    }
  }
`;

const VEHICLE_QUERY = gql`
  query Vehicle($id: String!) {
    vehicle(id: $id) {
      ${VEHICLE_FIELDS}
      conditionHistory {
        id
        code
        reason
        registeredByRole
        changedAt
      }
      unitAssignmentHistory {
        id
        startDate
        endDate
        unit {
          id
          name
        }
      }
      driverAssignmentHistory {
        id
        startDate
        endDate
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

const CREATE_VEHICLE_MUTATION = gql`
  mutation CreateVehicle($input: CreateVehicleInput!) {
    createVehicle(input: $input) {
      ${VEHICLE_FIELDS}
    }
  }
`;

const UPDATE_VEHICLE_MUTATION = gql`
  mutation UpdateVehicle($id: String!, $input: UpdateVehicleInput!) {
    updateVehicle(id: $id, input: $input) {
      ${VEHICLE_FIELDS}
    }
  }
`;

const REGISTER_VEHICLE_CONDITION_MUTATION = gql`
  mutation RegisterVehicleCondition($vehicleId: String!, $input: RegisterVehicleConditionInput!) {
    registerVehicleCondition(vehicleId: $vehicleId, input: $input) {
      id
      code
      reason
      changedAt
    }
  }
`;

const ACTIVE_VEHICLES_QUERY = gql`
  query ActiveVehicles {
    vehicles(take: 100) {
      items {
        id
        plate
        isActive
      }
    }
  }
`;

interface VehiclesQueryResult {
  vehicles: VehiclePage;
}

interface VehicleQueryResult {
  vehicle: Vehicle;
}

export interface VehicleOption {
  id: string;
  plate: string;
  isActive: boolean;
}

interface ActiveVehiclesResult {
  vehicles: { items: VehicleOption[] };
}

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: VehicleFilter): Observable<VehiclePage> {
    return this.apollo
      .watchQuery<VehiclesQueryResult>({
        query: VEHICLES_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: VehiclesQueryResult) => data.vehicles, { items: [], total: 0 }),
      );
  }

  get(id: string): Observable<Vehicle | null> {
    return this.apollo
      .watchQuery<VehicleQueryResult>({
        query: VEHICLE_QUERY,
        variables: { id },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData<VehicleQueryResult, Vehicle | null>((data) => data.vehicle as Vehicle, null),
      );
  }

  /// Lista plana para el select de vehículo en asignaciones de unidad (spec
  /// 003). No hay filtro `isActive` en el backend (no lo pide el spec 001
  /// como filtro de listado); se filtra en el cliente.
  listAllActiveOptions(): Observable<VehicleOption[]> {
    return this.apollo
      .watchQuery<ActiveVehiclesResult>({
        query: ACTIVE_VEHICLES_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: ActiveVehiclesResult) => data.vehicles?.items, []),
        map((options) => options.filter((v) => v.isActive)),
      );
  }

  /// Para exportar (Excel/PDF): todo el resultado filtrado vigente, no sólo
  /// la página actual. `query()`, no `watchQuery()` + `firstValueFrom`: ver
  /// nota en `vehicle-photos.service.ts` sobre por qué esa combinación puede
  /// abortar la petición real.
  async listAll(filter: Omit<VehicleFilter, 'skip' | 'take'>): Promise<Vehicle[]> {
    return fetchAllPages((skip, take) =>
      firstValueFrom(
        this.apollo.query<VehiclesQueryResult>({
          query: VEHICLES_QUERY,
          variables: { ...filter, skip, take },
          fetchPolicy: 'network-only',
        }),
      ).then((result) => result.data?.vehicles ?? { items: [], total: 0 }),
    );
  }

  async create(input: CreateVehicleInput): Promise<Vehicle> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createVehicle: Vehicle }>({
        mutation: CREATE_VEHICLE_MUTATION,
        variables: { input },
        // Por nombre de operación, no por `{ query, variables }` exactas: la
        // lista activa casi nunca tiene variables `{}` (siempre lleva al
        // menos `take`), así que un refetch por variables no la alcanzaría.
        refetchQueries: ['Vehicles'],
      }),
    );
    return result.data!.createVehicle;
  }

  async update(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateVehicle: Vehicle }>({
        mutation: UPDATE_VEHICLE_MUTATION,
        variables: { id, input },
        // No se incluye 'Vehicle': la edición se dispara desde la ficha,
        // que ya se cerró para abrir este formulario, así que esa consulta
        // no está activa (Apollo lo advertiría sin motivo).
        refetchQueries: ['Vehicles'],
      }),
    );
    return result.data!.updateVehicle;
  }

  async registerCondition(vehicleId: string, input: RegisterVehicleConditionInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REGISTER_VEHICLE_CONDITION_MUTATION,
        variables: { vehicleId, input },
        refetchQueries: ['Vehicle', 'Vehicles'],
      }),
    );
  }
}

export type { Vehicle };
