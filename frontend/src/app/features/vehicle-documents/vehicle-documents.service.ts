import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CreateVehicleDocumentInput,
  VehicleDocument,
  VehicleDocumentFilter,
  VehicleDocumentPage,
} from './vehicle-document.model';

const VEHICLE_DOCUMENT_FIELDS = `
  id
  type
  documentNumber
  issuedAt
  expiresAt
  notes
  vehicle {
    id
    plate
  }
`;

const VEHICLE_DOCUMENTS_QUERY = gql`
  query VehicleDocuments($vehicleId: String, $type: DocumentType, $search: String, $skip: Int, $take: Int) {
    vehicleDocuments(vehicleId: $vehicleId, type: $type, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${VEHICLE_DOCUMENT_FIELDS}
      }
    }
  }
`;

const CREATE_VEHICLE_DOCUMENT_MUTATION = gql`
  mutation CreateVehicleDocument($input: CreateVehicleDocumentInput!) {
    createVehicleDocument(input: $input) {
      ${VEHICLE_DOCUMENT_FIELDS}
    }
  }
`;

interface VehicleDocumentsQueryResult {
  vehicleDocuments: VehicleDocumentPage;
}

@Injectable({ providedIn: 'root' })
export class VehicleDocumentsService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: VehicleDocumentFilter): Observable<VehicleDocumentPage> {
    return this.apollo
      .watchQuery<VehicleDocumentsQueryResult>({
        query: VEHICLE_DOCUMENTS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map(
          (result) =>
            (result.data?.vehicleDocuments as VehicleDocumentPage) ?? { items: [], total: 0 },
        ),
      );
  }

  async create(input: CreateVehicleDocumentInput): Promise<VehicleDocument> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createVehicleDocument: VehicleDocument }>({
        mutation: CREATE_VEHICLE_DOCUMENT_MUTATION,
        variables: { input },
        refetchQueries: ['VehicleDocuments'],
      }),
    );
    return result.data!.createVehicleDocument;
  }
}
