import { Module } from '@nestjs/common';
import { MaintenanceOrdersService } from './maintenance-orders.service.js';
import { MaintenanceOrdersResolver } from './maintenance-orders.resolver.js';

@Module({
  providers: [MaintenanceOrdersResolver, MaintenanceOrdersService],
  exports: [MaintenanceOrdersService],
})
export class MaintenanceOrdersModule {}
