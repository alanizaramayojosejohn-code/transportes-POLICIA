import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Personnel } from '../personnel/entities/personnel.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { VehicleDriverAssignmentsService } from './vehicle-driver-assignments.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';

/// Extiende Personnel con el vehículo a cargo vigente (spec 014). Vive aquí y
/// no en PersonnelModule por el mismo motivo que VehicleDriverResolver.
@Resolver(() => Personnel)
export class PersonnelVehicleResolver {
  constructor(
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  @ResolveField(() => Vehicle, { nullable: true })
  async currentVehicle(@Parent() personnel: Personnel) {
    const current =
      await this.vehicleDriverAssignmentsService.getCurrentForDriver(
        personnel.id,
      );
    return current ? this.vehiclesService.findOne(current.vehicleId) : null;
  }
}
