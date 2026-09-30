import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { queryData } from '../../core/graphql/query-data';
import { fetchAllPages } from '../../shared/export/report-export';
import { CreateIncidentInput, Incident, IncidentFilter, IncidentPage } from './incident.model';

const INCIDENT_FIELDS = `
  id
  code
  type
  occurredAt
  place
  description
  damages
  policeReportNumber
  vehicle {
    id
    plate
    currentUnit {
      id
      name
    }
  }
  driver {
    id
    firstName
    lastName
  }
`;

const INCIDENTS_QUERY = gql`
  query Incidents($vehicleId: String, $type: IncidentType, $search: String, $skip: Int, $take: Int) {
    incidents(vehicleId: $vehicleId, type: $type, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${INCIDENT_FIELDS}
      }
    }
  }
`;

const CREATE_INCIDENT_MUTATION = gql`
  mutation CreateIncident($input: CreateIncidentInput!) {
    createIncident(input: $input) {
      ${INCIDENT_FIELDS}
    }
  }
`;

interface IncidentsQueryResult {
  incidents: IncidentPage;
}

@Injectable({ providedIn: 'root' })
export class IncidentsService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: IncidentFilter): Observable<IncidentPage> {
    return this.apollo
      .watchQuery<IncidentsQueryResult>({
        query: INCIDENTS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: IncidentsQueryResult) => data.incidents, { items: [], total: 0 }),
      );
  }

  /// Para exportar: todo el resultado filtrado, no sólo la página actual.
  async listAll(filter: Omit<IncidentFilter, 'skip' | 'take'>): Promise<Incident[]> {
    return fetchAllPages((skip, take) =>
      firstValueFrom(
        this.apollo.query<IncidentsQueryResult>({
          query: INCIDENTS_QUERY,
          variables: { ...filter, skip, take },
          fetchPolicy: 'network-only',
        }),
      ).then((result) => result.data?.incidents ?? { items: [], total: 0 }),
    );
  }

  async create(input: CreateIncidentInput): Promise<Incident> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createIncident: Incident }>({
        mutation: CREATE_INCIDENT_MUTATION,
        variables: { input },
        refetchQueries: ['Incidents'],
      }),
    );
    return result.data!.createIncident;
  }
}
