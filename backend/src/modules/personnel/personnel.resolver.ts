import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PersonnelService } from './personnel.service.js';
import { Personnel } from './entities/personnel.entity.js';
import { PersonnelPage } from './entities/personnel-page.entity.js';
import { Unit } from '../units/entities/unit.entity.js';
import { CreatePersonnelInput } from './dto/create-personnel.input.js';
import { UpdatePersonnelInput } from './dto/update-personnel.input.js';
import { PersonnelFilterArgs } from './dto/personnel-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { unitScopeFor } from '../../common/unit-scope.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Puerta GraphQL del personal del Comando (fusión de specs 002 y 005). La
 * consulta está abierta a cualquier rol; sólo ADMINISTRADOR y TRANSPORTES
 * pueden escribir, mismo patrón que vehículos y unidades.
 */
@Resolver(() => Personnel)
export class PersonnelResolver {
  constructor(private readonly personnelService: PersonnelService) {}

  @Query(() => PersonnelPage, { name: 'personnel' })
  findAll(
    @Args() filters: PersonnelFilterArgs,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personnelService.findAll(filters, unitScopeFor(user));
  }

  @Query(() => Personnel, { name: 'personnelMember' })
  findOne(@Args('id') id: string) {
    return this.personnelService.findOne(id);
  }

  @ResolveField(() => Unit, { nullable: true })
  unit(@Parent() personnel: Personnel) {
    return this.personnelService.getUnit(personnel.unitId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Personnel)
  createPersonnel(
    @Args('input') input: CreatePersonnelInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personnelService.create(input, unitScopeFor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Personnel)
  updatePersonnel(
    @Args('id') id: string,
    @Args('input') input: UpdatePersonnelInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personnelService.update(id, input, unitScopeFor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Personnel)
  deactivatePersonnel(
    @Args('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personnelService.deactivate(id, unitScopeFor(user));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Personnel)
  reactivatePersonnel(
    @Args('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personnelService.reactivate(id, unitScopeFor(user));
  }
}
