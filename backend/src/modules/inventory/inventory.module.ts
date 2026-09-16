import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { InventoryResolver } from './inventory.resolver.js';

@Module({
  providers: [InventoryResolver, InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
