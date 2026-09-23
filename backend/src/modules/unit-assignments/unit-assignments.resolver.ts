import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UnitAssignmentsService } from './unit-assignments.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { UnitsService } from '../units/units.service.js';
import { UnitAssignment } from './entities/unit-assignment.entity.js';
import { UnitAssignmentPage } from './entities/unit-assignment-page.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Unit } from '../units/entities/unit.entity.js';
import { CreateUnitAssignmentInput } from './dto/create-unit-assignment.input.js';
import { CloseUnitAssignmentInput } from './dto/close-unit-assignment.input.js';
import { UpdateUnitAssignmentNotesInput } from './dto/update-unit-assignment-notes.input.js';
import { UnitAssignmentFilterArgs } from './dto/unit-assignment-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { unitScopeFor } from '../../common/unit-scope.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Resolver(() => UnitAssignment)
export class UnitAssignmentsResolver {
  constructor(
    private readonly unitAssignmentsService: UnitAssignmentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly unitsService: UnitsService,
  ) {}

  @Query(() => UnitAssignmentPage, { name: 'unitAssignments' })
  findAll(
    @Args() filters: UnitAssignmentFilterArgs,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitAssignmentsService.findAll(filters, unitScopeFor(user));
  }

  @ResolveField(() => Vehicle)
  vehicle(@Parent() assignment: UnitAssignment) {
    return this.vehiclesService.findOne(assignment.vehicleId);
  }

  @ResolveField(() => Unit)
  unit(@Parent() assignment: UnitAssignment) {
    return this.unitsService.findOne(assignment.unitId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => UnitAssignment)
  createUnitAssignment(
    @Args('input') input: CreateUnitAssignmentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitAssignmentsService.create(input, unitScopeFor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => UnitAssignment)
  closeUnitAssignment(
    @Args('input') input: CloseUnitAssignmentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitAssignmentsService.close(input, unitScopeFor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => UnitAssignment)
  updateUnitAssignmentNotes(
    @Args('input') input: UpdateUnitAssignmentNotesInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unitAssignmentsService.updateNotes(input, unitScopeFor(user));
  }
}
