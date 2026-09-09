import { Module } from '@nestjs/common';
import { UnitsService } from './units.service.js';
import { OfficersService } from './officers.service.js';
import { UnitsResolver } from './units.resolver.js';
import { OfficersResolver } from './officers.resolver.js';
import { TransportManagerAssignmentResolver } from './transport-manager-assignment.resolver.js';

@Module({
  providers: [
    UnitsService,
    OfficersService,
    UnitsResolver,
    OfficersResolver,
    TransportManagerAssignmentResolver,
  ],
  exports: [UnitsService, OfficersService],
})
export class UnitsModule {}
