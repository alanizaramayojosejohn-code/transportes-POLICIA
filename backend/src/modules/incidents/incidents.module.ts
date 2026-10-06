import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { IncidentsService } from './incidents.service.js';
import { IncidentsResolver } from './incidents.resolver.js';

@Module({
  imports: [VehiclesModule],
  providers: [IncidentsResolver, IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
