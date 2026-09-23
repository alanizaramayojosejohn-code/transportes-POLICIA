import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import {
  InventoryResolver,
  StockMovementResolver,
} from './inventory.resolver.js';
import { ProceduresModule } from '../procedures/procedures.module.js';

@Module({
  imports: [ProceduresModule],
  providers: [InventoryResolver, StockMovementResolver, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
