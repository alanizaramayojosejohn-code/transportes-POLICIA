import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Unit } from '../units/entities/unit.entity.js';
import { UnitAssignment } from './entities/unit-assignment.entity.js';
import { UnitAssignmentsService } from './unit-assignments.service.js';
import { UnitsService } from '../units/units.service.js';

/// Extiende Vehicle con la unidad actual y su historial (spec 003, RF-13).
/// Vive aquí y no en VehiclesModule para que vehicles no dependa de
/// unit-assignments.
@Resolver(() => Vehicle)
export class VehicleUnitResolver {
  constructor(
    private readonly unitAssignmentsService: UnitAssignmentsService,
    private readonly unitsService: UnitsService,
  ) {}

  @ResolveField(() => Unit, { nullable: true })
  async currentUnit(@Parent() vehicle: Vehicle) {
    const current = await this.unitAssignmentsService.getCurrentForVehicle(
      vehicle.id,
    );
    return current ? this.unitsService.findOne(current.unitId) : null;
  }

  @ResolveField(() => [UnitAssignment])
  unitAssignmentHistory(@Parent() vehicle: Vehicle) {
    return this.unitAssignmentsService.getHistoryForVehicle(vehicle.id);
  }
}
