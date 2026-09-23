import { Module } from '@nestjs/common';
import { VehicleDriverAssignmentsModule } from '../vehicle-driver-assignments/vehicle-driver-assignments.module.js';
import { ProceduresModule } from '../procedures/procedures.module.js';
import { FuelRecordsService } from './fuel-records.service.js';
import { FuelRecordsResolver } from './fuel-records.resolver.js';

@Module({
  imports: [VehicleDriverAssignmentsModule, ProceduresModule],
  providers: [FuelRecordsResolver, FuelRecordsService],
  exports: [FuelRecordsService],
})
export class FuelRecordsModule {}
