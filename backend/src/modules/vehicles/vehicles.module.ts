import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { VehiclesResolver } from './vehicles.resolver.js';
import { ProceduresModule } from '../procedures/procedures.module.js';

@Module({
  imports: [ProceduresModule],
  providers: [VehiclesResolver, VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
