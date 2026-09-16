import { Module } from '@nestjs/common';
import { FuelRecordsService } from './fuel-records.service.js';
import { FuelRecordsResolver } from './fuel-records.resolver.js';

@Module({
  providers: [FuelRecordsResolver, FuelRecordsService],
  exports: [FuelRecordsService],
})
export class FuelRecordsModule {}
