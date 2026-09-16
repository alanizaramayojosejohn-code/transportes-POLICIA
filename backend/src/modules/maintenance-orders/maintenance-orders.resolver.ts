import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MaintenanceOrdersService } from './maintenance-orders.service.js';
import { MaintenanceOrder } from './entities/maintenance-order.entity.js';
import { MaintenanceOrderPage } from './entities/maintenance-order-page.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { CreateMaintenanceOrderInput } from './dto/create-maintenance-order.input.js';
import { FinishMaintenanceOrderInput } from './dto/finish-maintenance-order.input.js';
import { MaintenanceOrderFilterArgs } from './dto/maintenance-order-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Puerta GraphQL del módulo (spec 008). La consulta está abierta a
 * cualquier rol; ADMINISTRADOR, TRANSPORTES y MANTENIMIENTO pueden
 * registrar y finalizar órdenes.
 */
@Resolver(() => MaintenanceOrder)
export class MaintenanceOrdersResolver {
  constructor(
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
  ) {}

  @Query(() => MaintenanceOrderPage, { name: 'maintenanceOrders' })
  findAll(@Args() filters: MaintenanceOrderFilterArgs) {
    return this.maintenanceOrdersService.findAll(filters);
  }

  @Query(() => MaintenanceOrder, { name: 'maintenanceOrder' })
  findOne(@Args('id') id: string) {
    return this.maintenanceOrdersService.findOne(id);
  }

  @ResolveField(() => Vehicle)
  vehicle(@Parent() order: MaintenanceOrder) {
    return this.maintenanceOrdersService.getVehicle(order.vehicleId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'MANTENIMIENTO')
  @Mutation(() => MaintenanceOrder)
  createMaintenanceOrder(
    @Args('input') input: CreateMaintenanceOrderInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenanceOrdersService.create(input, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'MANTENIMIENTO')
  @Mutation(() => MaintenanceOrder)
  finishMaintenanceOrder(
    @Args('id') id: string,
    @Args('input') input: FinishMaintenanceOrderInput,
  ) {
    return this.maintenanceOrdersService.finish(id, input);
  }
}
