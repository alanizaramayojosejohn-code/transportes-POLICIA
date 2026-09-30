import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { queryData } from '../../core/graphql/query-data';
import {
  AssignVehicleDriverInput,
  CloseVehicleDriverAssignmentInput,
  MyVehicleAssignment,
} from './vehicle-driver-assignment.model';

const MY_VEHICLE_ASSIGNMENT_QUERY = gql`
  query MyVehicleAssignment {
    myVehicleAssignment {
      id
      startDate
      vehicleId
      driverId
      vehicle {
        id
        plate
        lastOdometer
        currentUnit {
          id
          name
          currentManager {
            officer {
              id
              firstName
              lastName
              rank
            }
          }
        }
      }
    }
  }
`;

interface MyVehicleAssignmentResult {
  myVehicleAssignment: MyVehicleAssignment | null;
}

const ASSIGN_VEHICLE_DRIVER_MUTATION = gql`
  mutation AssignVehicleDriver($input: AssignVehicleDriverInput!) {
    assignVehicleDriver(input: $input) {
      id
      startDate
      vehicleId
      driverId
    }
  }
`;

const CLOSE_VEHICLE_DRIVER_ASSIGNMENT_MUTATION = gql`
  mutation CloseVehicleDriverAssignment($input: CloseVehicleDriverAssignmentInput!) {
    closeVehicleDriverAssignment(input: $input) {
      id
      endDate
    }
  }
`;

/** Encargo vigente de conductor por vehículo (spec 014). */
@Injectable({ providedIn: 'root' })
export class VehicleDriverAssignmentsService {
  constructor(private readonly apollo: Apollo) {}

  /// RF-15 (spec 014): «Mi vehículo» para el rol CONDUCTOR.
  myAssignment(): Observable<MyVehicleAssignment | null> {
    return this.apollo
      .watchQuery<MyVehicleAssignmentResult>({
        query: MY_VEHICLE_ASSIGNMENT_QUERY,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData<MyVehicleAssignmentResult, MyVehicleAssignment | null>(
          (data) => data.myVehicleAssignment as MyVehicleAssignment,
          null,
        ),
      );
  }

  async assign(input: AssignVehicleDriverInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: ASSIGN_VEHICLE_DRIVER_MUTATION,
        variables: { input },
        refetchQueries: ['PersonnelList', 'PersonnelMember', 'Vehicles', 'Vehicle'],
      }),
    );
  }

  async close(input: CloseVehicleDriverAssignmentInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate({
        mutation: CLOSE_VEHICLE_DRIVER_ASSIGNMENT_MUTATION,
        variables: { input },
        refetchQueries: ['PersonnelList', 'PersonnelMember', 'Vehicles', 'Vehicle'],
      }),
    );
  }
}
