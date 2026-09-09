import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CloseUnitAssignmentInput,
  CreateUnitAssignmentInput,
  UnitAssignment,
  UnitAssignmentFilter,
  UnitAssignmentPage,
  UpdateUnitAssignmentNotesInput,
} from './unit-assignment.model';

const ASSIGNMENT_FIELDS = `
  id
  startDate
  endDate
  reason
  referenceDocument
  notes
  vehicle {
    id
    plate
  }
  unit {
    id
    name
  }
`;

const UNIT_ASSIGNMENTS_QUERY = gql`
  query UnitAssignments($unitId: String, $current: Boolean, $search: String, $skip: Int, $take: Int) {
    unitAssignments(unitId: $unitId, current: $current, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${ASSIGNMENT_FIELDS}
      }
    }
  }
`;

const CREATE_UNIT_ASSIGNMENT_MUTATION = gql`
  mutation CreateUnitAssignment($input: CreateUnitAssignmentInput!) {
    createUnitAssignment(input: $input) {
      ${ASSIGNMENT_FIELDS}
    }
  }
`;

const CLOSE_UNIT_ASSIGNMENT_MUTATION = gql`
  mutation CloseUnitAssignment($input: CloseUnitAssignmentInput!) {
    closeUnitAssignment(input: $input) {
      ${ASSIGNMENT_FIELDS}
    }
  }
`;

const UPDATE_UNIT_ASSIGNMENT_NOTES_MUTATION = gql`
  mutation UpdateUnitAssignmentNotes($input: UpdateUnitAssignmentNotesInput!) {
    updateUnitAssignmentNotes(input: $input) {
      ${ASSIGNMENT_FIELDS}
    }
  }
`;

interface UnitAssignmentsQueryResult {
  unitAssignments: UnitAssignmentPage;
}

@Injectable({ providedIn: 'root' })
export class UnitAssignmentsService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: UnitAssignmentFilter): Observable<UnitAssignmentPage> {
    return this.apollo
      .watchQuery<UnitAssignmentsQueryResult>({
        query: UNIT_ASSIGNMENTS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map(
          (result) =>
            (result.data?.unitAssignments as UnitAssignmentPage) ?? { items: [], total: 0 },
        ),
      );
  }

  async create(input: CreateUnitAssignmentInput): Promise<UnitAssignment> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createUnitAssignment: UnitAssignment }>({
        mutation: CREATE_UNIT_ASSIGNMENT_MUTATION,
        variables: { input },
        refetchQueries: ['UnitAssignments', 'Vehicle', 'Unit', 'Units'],
      }),
    );
    return result.data!.createUnitAssignment;
  }

  async close(input: CloseUnitAssignmentInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: CLOSE_UNIT_ASSIGNMENT_MUTATION,
        variables: { input },
        refetchQueries: ['UnitAssignments', 'Vehicle', 'Unit', 'Units'],
      }),
    );
  }

  async updateNotes(input: UpdateUnitAssignmentNotesInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: UPDATE_UNIT_ASSIGNMENT_NOTES_MUTATION,
        variables: { input },
        refetchQueries: ['UnitAssignments'],
      }),
    );
  }
}
