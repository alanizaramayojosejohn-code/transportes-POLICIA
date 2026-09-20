import { Module } from '@nestjs/common';
import { VehicleDriverAssignmentsModule } from '../vehicle-driver-assignments/vehicle-driver-assignments.module.js';
import { OdometerReadingsService } from './odometer-readings.service.js';
import { OdometerReadingsResolver } from './odometer-readings.resolver.js';
import { VehicleOdometerResolver } from './vehicle-odometer.resolver.js';

@Module({
  imports: [VehicleDriverAssignmentsModule],
  providers: [
    OdometerReadingsResolver,
    OdometerReadingsService,
    VehicleOdometerResolver,
  ],
  exports: [OdometerReadingsService],
})
export class OdometerReadingsModule {}
