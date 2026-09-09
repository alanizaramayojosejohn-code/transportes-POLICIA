import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CreateOfficerInput,
  Officer,
  OfficerFilter,
  OfficerPage,
  UpdateOfficerInput,
} from './unit.model';

const OFFICER_FIELDS = `
  id
  ci
  ciComplement
  firstName
  lastName
  rank
  phone
  email
  isActive
  currentUnit {
    id
    name
  }
`;

const OFFICERS_QUERY = gql`
  query Officers($isActive: Boolean, $search: String, $skip: Int, $take: Int) {
    officers(isActive: $isActive, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${OFFICER_FIELDS}
      }
    }
  }
`;

const ACTIVE_OFFICERS_QUERY = gql`
  query ActiveOfficers {
    officers(isActive: true, take: 100) {
      items {
        id
        firstName
        lastName
        rank
      }
    }
  }
`;

const CREATE_OFFICER_MUTATION = gql`
  mutation CreateOfficer($input: CreateOfficerInput!) {
    createOfficer(input: $input) {
      ${OFFICER_FIELDS}
    }
  }
`;

const UPDATE_OFFICER_MUTATION = gql`
  mutation UpdateOfficer($id: String!, $input: UpdateOfficerInput!) {
    updateOfficer(id: $id, input: $input) {
      ${OFFICER_FIELDS}
    }
  }
`;

const DEACTIVATE_OFFICER_MUTATION = gql`
  mutation DeactivateOfficer($id: String!) {
    deactivateOfficer(id: $id) {
      id
      isActive
    }
  }
`;

interface OfficersQueryResult {
  officers: OfficerPage;
}

export interface OfficerOption {
  id: string;
  firstName: string;
  lastName: string;
  rank: string | null;
}

interface ActiveOfficersResult {
  officers: { items: OfficerOption[] };
}

@Injectable({ providedIn: 'root' })
export class OfficersService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: OfficerFilter): Observable<OfficerPage> {
    return this.apollo
      .watchQuery<OfficersQueryResult>({
        query: OFFICERS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.officers as OfficerPage) ?? { items: [], total: 0 }),
      );
  }

  listActiveOptions(): Observable<OfficerOption[]> {
    return this.apollo
      .watchQuery<ActiveOfficersResult>({
        query: ACTIVE_OFFICERS_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(map((result) => (result.data?.officers?.items as OfficerOption[]) ?? []));
  }

  async create(input: CreateOfficerInput): Promise<Officer> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createOfficer: Officer }>({
        mutation: CREATE_OFFICER_MUTATION,
        variables: { input },
        refetchQueries: ['Officers', 'ActiveOfficers'],
      }),
    );
    return result.data!.createOfficer;
  }

  async update(id: string, input: UpdateOfficerInput): Promise<Officer> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ updateOfficer: Officer }>({
        mutation: UPDATE_OFFICER_MUTATION,
        variables: { id, input },
        refetchQueries: ['Officers'],
      }),
    );
    return result.data!.updateOfficer;
  }

  async deactivate(id: string): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: DEACTIVATE_OFFICER_MUTATION,
        variables: { id },
        refetchQueries: ['Officers', 'ActiveOfficers'],
      }),
    );
  }
}
