import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OfficersService } from './officers.service.js';
import { UnitsService } from './units.service.js';
import { Officer } from './entities/officer.entity.js';
import { OfficerPage } from './entities/officer-page.entity.js';
import { Unit } from './entities/unit.entity.js';
import { CreateOfficerInput } from './dto/create-officer.input.js';
import { UpdateOfficerInput } from './dto/update-officer.input.js';
import { OfficerFilterArgs } from './dto/officer-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Resolver(() => Officer)
export class OfficersResolver {
  constructor(
    private readonly officersService: OfficersService,
    private readonly unitsService: UnitsService,
  ) {}

  @Query(() => OfficerPage, { name: 'officers' })
  findAll(@Args() filters: OfficerFilterArgs) {
    return this.officersService.findAll(filters);
  }

  @Query(() => Officer, { name: 'officer' })
  findOne(@Args('id') id: string) {
    return this.officersService.findOne(id);
  }

  @ResolveField(() => Unit, { nullable: true })
  currentUnit(@Parent() officer: Officer) {
    return officer.currentUnitId
      ? this.unitsService.findOne(officer.currentUnitId)
      : null;
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Officer)
  createOfficer(@Args('input') input: CreateOfficerInput) {
    return this.officersService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Officer)
  updateOfficer(
    @Args('id') id: string,
    @Args('input') input: UpdateOfficerInput,
  ) {
    return this.officersService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Officer)
  deactivateOfficer(@Args('id') id: string) {
    return this.officersService.deactivate(id);
  }
}
