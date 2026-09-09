import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
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
    return (
      this.apollo
        .watchQuery<VehiclesQueryResult>({
          query: VEHICLES_QUERY,
          variables: filter,
          fetchPolicy: 'cache-and-network',
        })
        // Apollo Client v4 tipa `data` como potencialmente parcial o ausente
        // mientras la primera respuesta sigue en vuelo; esta consulta no usa
        // `errorPolicy: 'all'` ni datos enmascarados, así que en la práctica
        // siempre llega completo salvo ese instante inicial.
        .valueChanges.pipe(
          map((result) => (result.data?.vehicles as VehiclePage) ?? { items: [], total: 0 }),
        )
    );
  }

  get(id: string): Observable<Vehicle> {
    return this.apollo
      .watchQuery<VehicleQueryResult>({
        query: VEHICLE_QUERY,
        variables: { id },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => result.data?.vehicle as Vehicle));
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
        map((result) =>
          ((result.data?.vehicles?.items as VehicleOption[]) ?? []).filter((v) => v.isActive),
        ),
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
