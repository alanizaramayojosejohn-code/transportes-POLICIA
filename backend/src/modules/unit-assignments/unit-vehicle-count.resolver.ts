import { Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Unit } from '../units/entities/unit.entity.js';
import { UnitAssignmentsService } from './unit-assignments.service.js';

/// Extiende Unit con el conteo de vehículos asignados vigentes (spec 003,
/// RF-15). Vive aquí y no en UnitsModule por el mismo motivo que
/// VehicleUnitResolver.
@Resolver(() => Unit)
export class UnitVehicleCountResolver {
  constructor(
    private readonly unitAssignmentsService: UnitAssignmentsService,
  ) {}

  @ResolveField(() => Int)
  activeVehicleCount(@Parent() unit: Unit) {
    return this.unitAssignmentsService.countActiveForUnit(unit.id);
  }
}
