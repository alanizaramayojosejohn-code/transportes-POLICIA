import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service.js';
import { Unit } from './entities/unit.entity.js';
import { UnitPage } from './entities/unit-page.entity.js';
import { TransportManagerAssignment } from './entities/transport-manager-assignment.entity.js';
import { CreateUnitInput } from './dto/create-unit.input.js';
import { UpdateUnitInput } from './dto/update-unit.input.js';
import { UnitFilterArgs } from './dto/unit-filter.args.js';
import { AssignTransportManagerInput } from './dto/assign-transport-manager.input.js';
import { CloseTransportManagerAssignmentInput } from './dto/close-transport-manager-assignment.input.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * No decide nada: valida la forma de la entrada (ValidationPipe global) y
 * delega en UnitsService.
 */
@Resolver(() => Unit)
export class UnitsResolver {
  constructor(private readonly unitsService: UnitsService) {}

  @Query(() => UnitPage, { name: 'units' })
  findAll(@Args() filters: UnitFilterArgs) {
    return this.unitsService.findAll(filters);
  }

  @Query(() => Unit, { name: 'unit' })
  findOne(@Args('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @ResolveField(() => Unit, { nullable: true })
  parent(@Parent() unit: Unit) {
    return unit.parentId ? this.unitsService.findOne(unit.parentId) : null;
  }

  @ResolveField(() => [Unit])
  children(@Parent() unit: Unit) {
    return this.unitsService.findChildren(unit.id);
  }

  @ResolveField(() => TransportManagerAssignment, { nullable: true })
  currentManager(@Parent() unit: Unit) {
    return this.unitsService.getCurrentManager(unit.id);
  }

  @ResolveField(() => [TransportManagerAssignment])
  managerHistory(@Parent() unit: Unit) {
    return this.unitsService.getManagerHistory(unit.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Unit)
  createUnit(@Args('input') input: CreateUnitInput) {
    return this.unitsService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Unit)
  updateUnit(@Args('id') id: string, @Args('input') input: UpdateUnitInput) {
    return this.unitsService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Unit)
  deactivateUnit(@Args('id') id: string) {
    return this.unitsService.deactivate(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Unit)
  reactivateUnit(@Args('id') id: string) {
    return this.unitsService.reactivate(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => TransportManagerAssignment)
  assignTransportManager(@Args('input') input: AssignTransportManagerInput) {
    return this.unitsService.assignTransportManager(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => TransportManagerAssignment)
  closeTransportManagerAssignment(
    @Args('input') input: CloseTransportManagerAssignmentInput,
  ) {
    return this.unitsService.closeTransportManagerAssignment(input);
  }
}
