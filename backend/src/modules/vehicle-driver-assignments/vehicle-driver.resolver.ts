import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Personnel } from '../personnel/entities/personnel.entity.js';
import { VehicleDriverAssignment } from './entities/vehicle-driver-assignment.entity.js';
import { VehicleDriverAssignmentsService } from './vehicle-driver-assignments.service.js';
import { PersonnelService } from '../personnel/personnel.service.js';

/// Extiende Vehicle con el conductor encargado vigente y su historial (spec
/// 014). Vive aquí y no en VehiclesModule para que vehicles no dependa de
/// vehicle-driver-assignments, mismo patrón que VehicleUnitResolver.
@Resolver(() => Vehicle)
export class VehicleDriverResolver {
  constructor(
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
    private readonly personnelService: PersonnelService,
  ) {}

  @ResolveField(() => Personnel, { nullable: true })
  async currentDriver(@Parent() vehicle: Vehicle) {
    const current =
      await this.vehicleDriverAssignmentsService.getCurrentForVehicle(
        vehicle.id,
      );
    return current ? this.personnelService.findOne(current.driverId) : null;
  }

  @ResolveField(() => [VehicleDriverAssignment])
  driverAssignmentHistory(@Parent() vehicle: Vehicle) {
    return this.vehicleDriverAssignmentsService.getHistoryForVehicle(
      vehicle.id,
    );
  }
}
