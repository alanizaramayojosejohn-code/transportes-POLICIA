import { Module } from '@nestjs/common';
import { MaintenanceOrdersService } from './maintenance-orders.service.js';
import { MaintenanceOrdersResolver } from './maintenance-orders.resolver.js';
import { ProceduresModule } from '../procedures/procedures.module.js';

@Module({
  imports: [ProceduresModule],
  providers: [MaintenanceOrdersResolver, MaintenanceOrdersService],
  exports: [MaintenanceOrdersService],
})
export class MaintenanceOrdersModule {}
