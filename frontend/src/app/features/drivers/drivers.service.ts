import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CreateDriverInput,
  Driver,
  DriverFilter,
  DriverPage,
  UpdateDriverInput,
} from './driver.model';

const DRIVER_FIELDS = `
  id
  firstName
  lastName
  ci
  rank
  licenseNumber
  licenseCategory
  licenseExpiresAt
  phone
  isActive
  unitId
  unit {
    id
    name
  }
`;

const DRIVERS_QUERY = gql`
  query Drivers($unitId: String, $isActive: Boolean, $search: String, $skip: Int, $take: Int) {
    drivers(unitId: $unitId, isActive: $isActive, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${DRIVER_FIELDS}
      }
    }
  }
`;

const DRIVER_QUERY = gql`
  query Driver($id: String!) {
    driver(id: $id) {
      ${DRIVER_FIELDS}
    }
  }
`;

const ALL_ACTIVE_DRIVERS_QUERY = gql`
  query AllActiveDrivers {
    drivers(isActive: true, take: 100) {
      items {
        id
        firstName
        lastName
        isActive
      }
    }
  }
`;

const CREATE_DRIVER_MUTATION = gql`
  mutation CreateDriver($input: CreateDriverInput!) {
    createDriver(input: $input) {
      ${DRIVER_FIELDS}
    }
  }
`;

const UPDATE_DRIVER_MUTATION = gql`
  mutation UpdateDriver($id: String!, $input: UpdateDriverInput!) {
    updateDriver(id: $id, input: $input) {
      ${DRIVER_FIELDS}
    }
  }
`;

const DEACTIVATE_DRIVER_MUTATION = gql`
  mutation DeactivateDriver($id: String!) {
    deactivateDriver(id: $id) {
      id
      isActive
    }
  }
`;

const REACTIVATE_DRIVER_MUTATION = gql`
  mutation ReactivateDriver($id: String!) {
    reactivateDriver(id: $id) {
      id
      isActive
    }
  }
`;

interface DriversQueryResult {
  drivers: DriverPage;
}

interface DriverQueryResult {
  driver: Driver;
}

export interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface AllActiveDriversResult {
  drivers: { items: DriverOption[] };
}

@Injectable({ providedIn: 'root' })
export class DriversService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: DriverFilter): Observable<DriverPage> {
    return this.apollo
      .watchQuery<DriversQueryResult>({
        query: DRIVERS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.drivers as DriverPage) ?? { items: [], total: 0 }),
      );
  }

  get(id: string): Observable<Driver> {
    return this.apollo
      .watchQuery<DriverQueryResult>({
        query: DRIVER_QUERY,
        variables: { id },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => result.data?.driver as Driver));
  }

  /// Lista plana para el select de conductor en recorridos (spec 006).
  listAllActiveOptions(): Observable<DriverOption[]> {
    return this.apollo
      .watchQuery<AllActiveDriversResult>({
        query: ALL_ACTIVE_DRIVERS_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => (result.data?.drivers?.items as DriverOption[]) ?? []));
  }

  async create(input: CreateDriverInput): Promise<Driver> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createDriver: Driver }>({
        mutation: CREATE_DRIVER_MUTATION,
        variables: { input },
        refetchQueries: ['Drivers'],
      }),
    );
    return result.data!.createDriver;
  }

  async update(id: string, input: UpdateDriverInput): Promise<Driver> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateDriver: Driver }>({
        mutation: UPDATE_DRIVER_MUTATION,
        variables: { id, input },
        refetchQueries: ['Drivers'],
      }),
    );
    return result.data!.updateDriver;
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DEACTIVATE_DRIVER_MUTATION,
        variables: { id },
        refetchQueries: ['Drivers'],
      }),
    );
  }

  async reactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REACTIVATE_DRIVER_MUTATION,
        variables: { id },
        refetchQueries: ['Drivers'],
      }),
    );
  }
}
