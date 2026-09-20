import { Module } from '@nestjs/common';
import { VehicleDriverAssignmentsModule } from '../vehicle-driver-assignments/vehicle-driver-assignments.module.js';
import { TripsService } from './trips.service.js';
import { TripsResolver } from './trips.resolver.js';

@Module({
  imports: [VehicleDriverAssignmentsModule],
  providers: [TripsResolver, TripsService],
  exports: [TripsService],
})
export class TripsModule {}
