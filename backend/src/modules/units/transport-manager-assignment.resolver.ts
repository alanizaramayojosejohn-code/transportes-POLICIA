import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { TransportManagerAssignment } from './entities/transport-manager-assignment.entity.js';
import { Officer } from './entities/officer.entity.js';
import { Unit } from './entities/unit.entity.js';
import { OfficersService } from './officers.service.js';
import { UnitsService } from './units.service.js';

/// Extiende TransportManagerAssignment con `officer`/`unit` resueltos, para
/// que el historial de encargados no obligue al cliente a pedirlos aparte.
@Resolver(() => TransportManagerAssignment)
export class TransportManagerAssignmentResolver {
  constructor(
    private readonly officersService: OfficersService,
    private readonly unitsService: UnitsService,
  ) {}

  @ResolveField(() => Officer)
  officer(@Parent() assignment: TransportManagerAssignment) {
    return this.officersService.findOne(assignment.officerId);
  }

  @ResolveField(() => Unit)
  unit(@Parent() assignment: TransportManagerAssignment) {
    return this.unitsService.findOne(assignment.unitId);
  }
}
