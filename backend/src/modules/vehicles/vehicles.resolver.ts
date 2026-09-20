import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehicleCondition } from './entities/vehicle-condition.entity.js';
import { VehiclePage } from './entities/vehicle-page.entity.js';
import { CreateVehicleInput } from './dto/create-vehicle.input.js';
import { UpdateVehicleInput } from './dto/update-vehicle.input.js';
import { VehicleFilterArgs } from './dto/vehicle-filter.args.js';
import { RegisterVehicleConditionInput } from './dto/register-vehicle-condition.input.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { unitScopeFor } from '../../common/unit-scope.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * No decide nada: valida la forma de la entrada (ValidationPipe global) y
 * delega en VehiclesService. Es la puerta GraphQL del módulo, igual que un
 * controller lo sería para REST.
 */
@Resolver(() => Vehicle)
export class VehiclesResolver {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Query(() => VehiclePage, { name: 'vehicles' })
  findAll(
    @Args() filters: VehicleFilterArgs,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.findAll(filters, unitScopeFor(user));
  }

  @Query(() => Vehicle, { name: 'vehicle' })
  findOne(@Args('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @ResolveField(() => VehicleCondition, { nullable: true })
  currentCondition(@Parent() vehicle: Vehicle) {
    return this.vehiclesService.getCurrentCondition(vehicle.id);
  }

  @ResolveField(() => [VehicleCondition])
  conditionHistory(@Parent() vehicle: Vehicle) {
    return this.vehiclesService.getConditionHistory(vehicle.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Vehicle)
  createVehicle(@Args('input') input: CreateVehicleInput) {
    return this.vehiclesService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Vehicle)
  updateVehicle(
    @Args('id') id: string,
    @Args('input') input: UpdateVehicleInput,
  ) {
    return this.vehiclesService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => VehicleCondition)
  registerVehicleCondition(
    @Args('vehicleId') vehicleId: string,
    @Args('input') input: RegisterVehicleConditionInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.registerCondition(vehicleId, input, user.role);
  }
}
