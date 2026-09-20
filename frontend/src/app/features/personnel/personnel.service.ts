import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CreatePersonnelInput,
  Personnel,
  PersonnelFilter,
  PersonnelPage,
  UpdatePersonnelInput,
} from './personnel.model';

const PERSONNEL_FIELDS = `
  id
  ci
  ciComplement
  firstName
  lastName
  rank
  phone
  email
  isActive
  isDriver
  isOfficer
  isAdmin
  licenseNumber
  licenseCategory
  licenseExpiresAt
  observations
  unitId
  unit {
    id
    name
  }
  currentVehicle {
    id
    plate
  }
  userId
`;

const PERSONNEL_LIST_QUERY = gql`
  query PersonnelList(
    $isDriver: Boolean
    $isOfficer: Boolean
    $isAdmin: Boolean
    $unitId: String
    $isActive: Boolean
    $search: String
    $skip: Int
    $take: Int
  ) {
    personnel(
      isDriver: $isDriver
      isOfficer: $isOfficer
      isAdmin: $isAdmin
      unitId: $unitId
      isActive: $isActive
      search: $search
      skip: $skip
      take: $take
    ) {
      total
      items {
        ${PERSONNEL_FIELDS}
      }
    }
  }
`;

const PERSONNEL_MEMBER_QUERY = gql`
  query PersonnelMember($id: String!) {
    personnelMember(id: $id) {
      ${PERSONNEL_FIELDS}
    }
  }
`;

const ACTIVE_PERSONNEL_OPTIONS_QUERY = gql`
  query ActivePersonnelOptions($isDriver: Boolean, $isOfficer: Boolean) {
    personnel(isDriver: $isDriver, isOfficer: $isOfficer, isActive: true, take: 200) {
      items {
        id
        firstName
        lastName
        rank
        isDriver
        isOfficer
        isAdmin
      }
    }
  }
`;

const CREATE_PERSONNEL_MUTATION = gql`
  mutation CreatePersonnel($input: CreatePersonnelInput!) {
    createPersonnel(input: $input) {
      ${PERSONNEL_FIELDS}
    }
  }
`;

const UPDATE_PERSONNEL_MUTATION = gql`
  mutation UpdatePersonnel($id: String!, $input: UpdatePersonnelInput!) {
    updatePersonnel(id: $id, input: $input) {
      ${PERSONNEL_FIELDS}
    }
  }
`;

const DEACTIVATE_PERSONNEL_MUTATION = gql`
  mutation DeactivatePersonnel($id: String!) {
    deactivatePersonnel(id: $id) {
      id
      isActive
    }
  }
`;

const REACTIVATE_PERSONNEL_MUTATION = gql`
  mutation ReactivatePersonnel($id: String!) {
    reactivatePersonnel(id: $id) {
      id
      isActive
    }
  }
`;

interface PersonnelListResult {
  personnel: PersonnelPage;
}

interface PersonnelMemberResult {
  personnelMember: Personnel;
}

export interface PersonnelOption {
  id: string;
  firstName: string;
  lastName: string;
  rank: string | null;
  isDriver: boolean;
  isOfficer: boolean;
  isAdmin: boolean;
}

interface ActivePersonnelOptionsResult {
  personnel: { items: PersonnelOption[] };
}

@Injectable({ providedIn: 'root' })
export class PersonnelService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: PersonnelFilter): Observable<PersonnelPage> {
    return this.apollo
      .watchQuery<PersonnelListResult>({
        query: PERSONNEL_LIST_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.personnel as PersonnelPage) ?? { items: [], total: 0 }),
      );
  }

  get(id: string): Observable<Personnel> {
    return this.apollo
      .watchQuery<PersonnelMemberResult>({
        query: PERSONNEL_MEMBER_QUERY,
        variables: { id },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => result.data?.personnelMember as Personnel));
  }

  /// Lista plana para selects (conductor en recorridos/combustible/incidentes,
  /// encargado en unidades). `roleFilter` deja pasar sólo conductores, sólo
  /// encargados, o (sin filtro) cualquier persona activa — el picker de
  /// encargados intencionalmente no se restringe a `isOfficer`, porque
  /// cualquier persona activa puede designarse encargada (el rol se marca al
  /// designarla, no antes).
  listActiveOptions(roleFilter?: {
    isDriver?: boolean;
    isOfficer?: boolean;
  }): Observable<PersonnelOption[]> {
    return this.apollo
      .watchQuery<ActivePersonnelOptionsResult>({
        query: ACTIVE_PERSONNEL_OPTIONS_QUERY,
        variables: { isDriver: roleFilter?.isDriver, isOfficer: roleFilter?.isOfficer },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.personnel?.items as PersonnelOption[]) ?? []),
      );
  }

  async create(input: CreatePersonnelInput): Promise<Personnel> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createPersonnel: Personnel }>({
        mutation: CREATE_PERSONNEL_MUTATION,
        variables: { input },
        refetchQueries: ['PersonnelList', 'ActivePersonnelOptions'],
      }),
    );
    return result.data!.createPersonnel;
  }

  async update(id: string, input: UpdatePersonnelInput): Promise<Personnel> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updatePersonnel: Personnel }>({
        mutation: UPDATE_PERSONNEL_MUTATION,
        variables: { id, input },
        refetchQueries: ['PersonnelList', 'PersonnelMember', 'ActivePersonnelOptions'],
      }),
    );
    return result.data!.updatePersonnel;
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DEACTIVATE_PERSONNEL_MUTATION,
        variables: { id },
        refetchQueries: ['PersonnelList', 'ActivePersonnelOptions'],
      }),
    );
  }

  async reactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REACTIVATE_PERSONNEL_MUTATION,
        variables: { id },
        refetchQueries: ['PersonnelList', 'ActivePersonnelOptions'],
      }),
    );
  }
}
