import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import {
  InventoryResolver,
  StockMovementResolver,
} from './inventory.resolver.js';
import { ProceduresModule } from '../procedures/procedures.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { MaintenanceOrdersModule } from '../maintenance-orders/maintenance-orders.module.js';

@Module({
  imports: [ProceduresModule, VehiclesModule, MaintenanceOrdersModule],
  providers: [InventoryResolver, StockMovementResolver, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
