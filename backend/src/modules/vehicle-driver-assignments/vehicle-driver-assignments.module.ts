import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { PersonnelModule } from '../personnel/personnel.module.js';
import { UnitAssignmentsModule } from '../unit-assignments/unit-assignments.module.js';
import { VehicleDriverAssignmentsService } from './vehicle-driver-assignments.service.js';
import { VehicleDriverAssignmentsResolver } from './vehicle-driver-assignments.resolver.js';
import { VehicleDriverResolver } from './vehicle-driver.resolver.js';
import { PersonnelVehicleResolver } from './personnel-vehicle.resolver.js';

/// Depende de VehiclesModule, PersonnelModule y UnitAssignmentsModule (para
/// resolver a qué unidad pertenece un vehículo y aplicar el alcance por
/// unidad, spec 015); nunca al revés, ver comentario en
/// VehicleDriverAssignmentsService.
@Module({
  imports: [VehiclesModule, PersonnelModule, UnitAssignmentsModule],
  providers: [
    VehicleDriverAssignmentsService,
    VehicleDriverAssignmentsResolver,
    VehicleDriverResolver,
    PersonnelVehicleResolver,
  ],
  exports: [VehicleDriverAssignmentsService],
})
export class VehicleDriverAssignmentsModule {}
