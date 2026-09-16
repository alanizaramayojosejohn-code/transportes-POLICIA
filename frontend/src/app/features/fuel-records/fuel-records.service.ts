import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, map, Observable } from 'rxjs';
import {
  CreateFuelRecordInput,
  FuelRecord,
  FuelRecordFilter,
  FuelRecordPage,
} from './fuel-record.model';

const FUEL_RECORD_FIELDS = `
  id
  suppliedAt
  fuelType
  quantity
  unitPrice
  totalCost
  station
  ticketNumber
  odometer
  efficiencyKmPerUnit
  notes
  vehicle {
    id
    plate
  }
  driver {
    id
    firstName
    lastName
  }
`;

const FUEL_RECORDS_QUERY = gql`
  query FuelRecords($vehicleId: String, $fuelType: FuelType, $fromDate: String, $toDate: String, $search: String, $skip: Int, $take: Int) {
    fuelRecords(vehicleId: $vehicleId, fuelType: $fuelType, fromDate: $fromDate, toDate: $toDate, search: $search, skip: $skip, take: $take) {
      total
      items {
        ${FUEL_RECORD_FIELDS}
      }
    }
  }
`;

const CREATE_FUEL_RECORD_MUTATION = gql`
  mutation CreateFuelRecord($input: CreateFuelRecordInput!) {
    createFuelRecord(input: $input) {
      ${FUEL_RECORD_FIELDS}
    }
  }
`;

interface FuelRecordsQueryResult {
  fuelRecords: FuelRecordPage;
}

@Injectable({ providedIn: 'root' })
export class FuelRecordsService {
  constructor(private readonly apollo: Apollo) {}

  list(filter: FuelRecordFilter): Observable<FuelRecordPage> {
    return this.apollo
      .watchQuery<FuelRecordsQueryResult>({
        query: FUEL_RECORDS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => (result.data?.fuelRecords as FuelRecordPage) ?? { items: [], total: 0 }),
      );
  }

  async create(input: CreateFuelRecordInput): Promise<FuelRecord> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createFuelRecord: FuelRecord }>({
        mutation: CREATE_FUEL_RECORD_MUTATION,
        variables: { input },
        refetchQueries: ['FuelRecords'],
      }),
    );
    return result.data!.createFuelRecord;
  }
}
