import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  AssignTransportManagerInput,
  CloseTransportManagerAssignmentInput,
  CreateUnitInput,
  TransportManagerAssignment,
  Unit,
  UnitFilter,
  UnitOption,
  UnitPage,
  UpdateUnitInput,
} from './unit.model';

const UNIT_FIELDS = `
  id
  code
  name
  type
  location
  isActive
  parentId
  activeVehicleCount
  parent {
    id
    name
  }
  currentManager {
    id
    startDate
    referenceDocument
    notes
    officer {
      id
      firstName
      lastName
      rank
    }
  }
`;

const UNITS_QUERY = gql`
  query Units($isActive: Boolean, $parentId: String, $search: String, $skip: Int, $take: Int) {
    units(isActive: $isActive, parentId: $parentId, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${UNIT_FIELDS}
      }
    }
  }
`;

const UNIT_QUERY = gql`
  query Unit($id: String!) {
    unit(id: $id) {
      ${UNIT_FIELDS}
      children {
        id
        name
        isActive
      }
      managerHistory {
        id
        startDate
        endDate
        referenceDocument
        notes
        officer {
          id
          firstName
          lastName
          rank
        }
      }
    }
  }
`;

const ALL_ACTIVE_UNITS_QUERY = gql`
  query AllActiveUnits {
    units(isActive: true, take: 100) {
      items {
        id
        name
        isActive
      }
    }
  }
`;

const CREATE_UNIT_MUTATION = gql`
  mutation CreateUnit($input: CreateUnitInput!) {
    createUnit(input: $input) {
      ${UNIT_FIELDS}
    }
  }
`;

const UPDATE_UNIT_MUTATION = gql`
  mutation UpdateUnit($id: String!, $input: UpdateUnitInput!) {
    updateUnit(id: $id, input: $input) {
      ${UNIT_FIELDS}
    }
  }
`;

const DEACTIVATE_UNIT_MUTATION = gql`
  mutation DeactivateUnit($id: String!) {
    deactivateUnit(id: $id) {
      id
      isActive
    }
  }
`;

const REACTIVATE_UNIT_MUTATION = gql`
  mutation ReactivateUnit($id: String!) {
    reactivateUnit(id: $id) {
      id
      isActive
    }
  }
`;

const ASSIGN_TRANSPORT_MANAGER_MUTATION = gql`
  mutation AssignTransportManager($input: AssignTransportManagerInput!) {
    assignTransportManager(input: $input) {
      id
    }
  }
`;

const CLOSE_TRANSPORT_MANAGER_ASSIGNMENT_MUTATION = gql`
  mutation CloseTransportManagerAssignment($input: CloseTransportManagerAssignmentInput!) {
    closeTransportManagerAssignment(input: $input) {
      id
    }
  }
`;

interface UnitsQueryResult {
  units: UnitPage;
}

interface UnitQueryResult {
  unit: Unit;
}

interface AllActiveUnitsResult {
  units: { items: UnitOption[] };
}

@Injectable({ providedIn: 'root' })
export class UnitsService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: UnitFilter): Observable<UnitPage> {
    return this.apollo
      .watchQuery<UnitsQueryResult>({
        query: UNITS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.units as UnitPage) ?? { items: [], total: 0 }),
      );
  }

  get(id: string): Observable<Unit> {
    return this.apollo
      .watchQuery<UnitQueryResult>({
        query: UNIT_QUERY,
        variables: { id },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => result.data?.unit as Unit));
  }

  /// Lista plana para selects (unidad superior, unidad actual del personal).
  listAllActiveOptions(): Observable<UnitOption[]> {
    return this.apollo
      .watchQuery<AllActiveUnitsResult>({
        query: ALL_ACTIVE_UNITS_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => (result.data?.units?.items as UnitOption[]) ?? []));
  }

  async create(input: CreateUnitInput): Promise<Unit> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createUnit: Unit }>({
        mutation: CREATE_UNIT_MUTATION,
        variables: { input },
        refetchQueries: ['Units', 'AllActiveUnits'],
      }),
    );
    return result.data!.createUnit;
  }

  async update(id: string, input: UpdateUnitInput): Promise<Unit> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateUnit: Unit }>({
        mutation: UPDATE_UNIT_MUTATION,
        variables: { id, input },
        refetchQueries: ['Units'],
      }),
    );
    return result.data!.updateUnit;
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DEACTIVATE_UNIT_MUTATION,
        variables: { id },
        refetchQueries: ['Units', 'Unit', 'AllActiveUnits'],
      }),
    );
  }

  async reactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REACTIVATE_UNIT_MUTATION,
        variables: { id },
        refetchQueries: ['Units', 'Unit', 'AllActiveUnits'],
      }),
    );
  }

  async assignTransportManager(
    input: AssignTransportManagerInput,
  ): Promise<TransportManagerAssignment> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ assignTransportManager: TransportManagerAssignment }>({
        mutation: ASSIGN_TRANSPORT_MANAGER_MUTATION,
        variables: { input },
        refetchQueries: ['Units', 'Unit'],
      }),
    );
    return result.data!.assignTransportManager;
  }

  async closeTransportManagerAssignment(
    input: CloseTransportManagerAssignmentInput,
  ): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: CLOSE_TRANSPORT_MANAGER_ASSIGNMENT_MUTATION,
        variables: { input },
        refetchQueries: ['Units', 'Unit'],
      }),
    );
  }
}
