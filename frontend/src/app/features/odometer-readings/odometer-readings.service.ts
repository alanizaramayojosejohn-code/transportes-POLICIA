import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { RegisterOdometerReadingInput } from './odometer-reading.model';

const REGISTER_ODOMETER_READING_MUTATION = gql`
  mutation RegisterOdometerReading($input: RegisterOdometerReadingInput!) {
    registerOdometerReading(input: $input) {
      id
      value
      readingAt
    }
  }
`;

/** Kilometraje suelto (spec 014, RF-16/RF-17). */
@Injectable({ providedIn: 'root' })
export class OdometerReadingsService {
  constructor(private readonly apollo: Apollo) {}

  async register(input: RegisterOdometerReadingInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: REGISTER_ODOMETER_READING_MUTATION,
        variables: { input },
        refetchQueries: ['Vehicle', 'Vehicles', 'MyVehicleAssignment'],
      }),
    );
  }
}
