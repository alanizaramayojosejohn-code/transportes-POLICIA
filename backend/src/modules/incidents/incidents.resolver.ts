import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IncidentsService } from './incidents.service.js';
import { Incident } from './entities/incident.entity.js';
import { IncidentPage } from './entities/incident-page.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Personnel } from '../personnel/entities/personnel.entity.js';
import { CreateIncidentInput } from './dto/create-incident.input.js';
import { IncidentFilterArgs } from './dto/incident-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { unitScopeFor } from '../../common/unit-scope.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Puerta GraphQL del módulo (spec 011). La consulta está abierta a
 * cualquier rol; sólo ADMINISTRADOR y TRANSPORTES pueden registrar
 * incidentes.
 */
@Resolver(() => Incident)
export class IncidentsResolver {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Query(() => IncidentPage, { name: 'incidents' })
  findAll(
    @Args() filters: IncidentFilterArgs,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentsService.findAll(filters, unitScopeFor(user));
  }

  @ResolveField(() => Vehicle)
  vehicle(@Parent() incident: Incident) {
    return this.incidentsService.getVehicle(incident.vehicleId);
  }

  @ResolveField(() => Personnel, { nullable: true })
  driver(@Parent() incident: Incident) {
    return this.incidentsService.getDriver(incident.driverId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Incident)
  createIncident(
    @Args('input') input: CreateIncidentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentsService.create(input, user);
  }
}
