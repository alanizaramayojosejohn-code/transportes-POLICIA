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
import { ProceduresService } from '../procedures/procedures.service.js';
import { ProcedureChecklistItem } from '../procedures/entities/procedure-checklist-item.entity.js';
import { UpdateProcedureChecklistItemInput } from '../procedures/dto/update-procedure-checklist-item.input.js';

/**
 * Puerta GraphQL del módulo (spec 008). La consulta está abierta a
 * cualquier rol; ADMINISTRADOR, TRANSPORTES y MANTENIMIENTO pueden
 * registrar y finalizar órdenes.
 */
@Resolver(() => MaintenanceOrder)
export class MaintenanceOrdersResolver {
  constructor(
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
    private readonly proceduresService: ProceduresService,
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

  /// Spec 016 RF-17.
  @ResolveField(() => [ProcedureChecklistItem])
  procedureChecklistItems(@Parent() order: MaintenanceOrder) {
    return this.proceduresService.listItems('maintenanceOrderId', order.id);
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

  /// Spec 016 RF-15/RF-20: mismo permiso que registrar la orden.
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'MANTENIMIENTO')
  @Mutation(() => [ProcedureChecklistItem])
  updateMaintenanceOrderChecklist(
    @Args('maintenanceOrderId') maintenanceOrderId: string,
    @Args({ name: 'items', type: () => [UpdateProcedureChecklistItemInput] })
    items: UpdateProcedureChecklistItemInput[],
  ) {
    return this.proceduresService.updateItems(
      'maintenanceOrderId',
      maintenanceOrderId,
      items,
    );
  }
}
