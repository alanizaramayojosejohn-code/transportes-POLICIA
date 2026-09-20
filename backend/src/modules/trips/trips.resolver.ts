import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import { Trip } from './entities/trip.entity.js';
import { TripPage } from './entities/trip-page.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Personnel } from '../personnel/entities/personnel.entity.js';
import { CreateTripInput } from './dto/create-trip.input.js';
import { CloseTripInput } from './dto/close-trip.input.js';
import { TripFilterArgs } from './dto/trip-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Puerta GraphQL del módulo (spec 006). La consulta está abierta a
 * cualquier rol; sólo ADMINISTRADOR y TRANSPORTES pueden abrir o cerrar un
 * recorrido, mismo patrón que vehículos, unidades y conductores.
 */
@Resolver(() => Trip)
export class TripsResolver {
  constructor(private readonly tripsService: TripsService) {}

  @Query(() => TripPage, { name: 'trips' })
  findAll(@Args() filters: TripFilterArgs) {
    return this.tripsService.findAll(filters);
  }

  @Query(() => Trip, { name: 'trip' })
  findOne(@Args('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @ResolveField(() => Vehicle)
  vehicle(@Parent() trip: Trip) {
    return this.tripsService.getVehicle(trip.assignmentId);
  }

  @ResolveField(() => Personnel)
  driver(@Parent() trip: Trip) {
    return this.tripsService.getDriver(trip.assignmentId);
  }

  @ResolveField(() => String)
  destination(@Parent() trip: Trip) {
    return this.tripsService.getDestination(trip.assignmentId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'CONDUCTOR')
  @Mutation(() => Trip)
  createTrip(
    @Args('input') input: CreateTripInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripsService.create(input, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'CONDUCTOR')
  @Mutation(() => Trip)
  closeTrip(
    @Args('id') id: string,
    @Args('input') input: CloseTripInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripsService.close(id, input, user);
  }
}
