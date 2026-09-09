import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { UnitsModule } from '../units/units.module.js';
import { UnitAssignmentsService } from './unit-assignments.service.js';
import { UnitAssignmentsResolver } from './unit-assignments.resolver.js';
import { VehicleUnitResolver } from './vehicle-unit.resolver.js';
import { UnitVehicleCountResolver } from './unit-vehicle-count.resolver.js';

/// Depende de VehiclesModule y UnitsModule (nunca al revés, ver comentario en
/// UnitAssignmentsService).
@Module({
  imports: [VehiclesModule, UnitsModule],
  providers: [
    UnitAssignmentsService,
    UnitAssignmentsResolver,
    VehicleUnitResolver,
    UnitVehicleCountResolver,
  ],
  exports: [UnitAssignmentsService],
})
export class UnitAssignmentsModule {}
