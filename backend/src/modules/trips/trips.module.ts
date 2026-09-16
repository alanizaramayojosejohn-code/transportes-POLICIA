import { Module } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import { TripsResolver } from './trips.resolver.js';

@Module({
  providers: [TripsResolver, TripsService],
  exports: [TripsService],
})
export class TripsModule {}
