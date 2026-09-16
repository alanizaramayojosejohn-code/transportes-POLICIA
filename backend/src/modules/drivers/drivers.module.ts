import { Module } from '@nestjs/common';
import { DriversService } from './drivers.service.js';
import { DriversResolver } from './drivers.resolver.js';

@Module({
  providers: [DriversResolver, DriversService],
  exports: [DriversService],
})
export class DriversModule {}
