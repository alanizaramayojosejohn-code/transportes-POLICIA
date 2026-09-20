import { Module } from '@nestjs/common';
import { UnitsService } from './units.service.js';
import { UnitsResolver } from './units.resolver.js';
import { TransportManagerAssignmentResolver } from './transport-manager-assignment.resolver.js';
import { PersonnelModule } from '../personnel/personnel.module.js';

@Module({
  imports: [PersonnelModule],
  providers: [UnitsService, UnitsResolver, TransportManagerAssignmentResolver],
  exports: [UnitsService],
})
export class UnitsModule {}
