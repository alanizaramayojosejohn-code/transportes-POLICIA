import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { TransportManagerAssignment } from './entities/transport-manager-assignment.entity.js';
import { Personnel } from '../personnel/entities/personnel.entity.js';
import { Unit } from './entities/unit.entity.js';
import { PersonnelService } from '../personnel/personnel.service.js';
import { UnitsService } from './units.service.js';

/// Extiende TransportManagerAssignment con `officer`/`unit` resueltos, para
/// que el historial de encargados no obligue al cliente a pedirlos aparte.
@Resolver(() => TransportManagerAssignment)
export class TransportManagerAssignmentResolver {
  constructor(
    private readonly personnelService: PersonnelService,
    private readonly unitsService: UnitsService,
  ) {}

  @ResolveField(() => Personnel)
  officer(@Parent() assignment: TransportManagerAssignment) {
    return this.personnelService.findOne(assignment.officerId);
  }

  @ResolveField(() => Unit)
  unit(@Parent() assignment: TransportManagerAssignment) {
    return this.unitsService.findOne(assignment.unitId);
  }
}
