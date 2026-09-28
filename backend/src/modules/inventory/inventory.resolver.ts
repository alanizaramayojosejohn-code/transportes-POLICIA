import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { SparePart } from './entities/spare-part.entity.js';
import { SparePartPage } from './entities/spare-part-page.entity.js';
import { SparePartCategory } from './entities/spare-part-category.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
import { StockMovementPage } from './entities/stock-movement-page.entity.js';
import { CreateSparePartInput } from './dto/create-spare-part.input.js';
import { UpdateSparePartInput } from './dto/update-spare-part.input.js';
import { SparePartFilterArgs } from './dto/spare-part-filter.args.js';
import { CreateStockMovementInput } from './dto/create-stock-movement.input.js';
import { StockMovementFilterArgs } from './dto/stock-movement-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ProceduresService } from '../procedures/procedures.service.js';
import { ProcedureChecklistItem } from '../procedures/entities/procedure-checklist-item.entity.js';
import { UpdateProcedureChecklistItemInput } from '../procedures/dto/update-procedure-checklist-item.input.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { MaintenanceOrdersService } from '../maintenance-orders/maintenance-orders.service.js';
import { MaintenanceOrder } from '../maintenance-orders/entities/maintenance-order.entity.js';

/**
 * Puerta GraphQL del módulo (spec 009). La consulta está abierta a
 * cualquier rol; ADMINISTRADOR, TRANSPORTES y ALMACEN pueden escribir.
 */
@Resolver(() => SparePart)
export class InventoryResolver {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly proceduresService: ProceduresService,
  ) {}

  @Query(() => SparePartPage, { name: 'spareParts' })
  findAll(@Args() filters: SparePartFilterArgs) {
    return this.inventoryService.findAll(filters);
  }

  @Query(() => SparePart, { name: 'sparePart' })
  findOne(@Args('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Query(() => [SparePartCategory], { name: 'sparePartCategories' })
  listCategories() {
    return this.inventoryService.listCategories();
  }

  /// Reporte «Movimientos de almacén» (spec 018).
  @Query(() => StockMovementPage, { name: 'stockMovements' })
  findAllMovements(@Args() filters: StockMovementFilterArgs) {
    return this.inventoryService.findAllMovements(filters);
  }

  @ResolveField(() => SparePartCategory, { nullable: true })
  category(@Parent() part: SparePart) {
    return this.inventoryService.getCategory(part.categoryId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'ALMACEN')
  @Mutation(() => SparePart)
  createSparePart(@Args('input') input: CreateSparePartInput) {
    return this.inventoryService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'ALMACEN')
  @Mutation(() => SparePart)
  updateSparePart(
    @Args('id') id: string,
    @Args('input') input: UpdateSparePartInput,
  ) {
    return this.inventoryService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'ALMACEN')
  @Mutation(() => SparePart)
  deactivateSparePart(@Args('id') id: string) {
    return this.inventoryService.deactivate(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'ALMACEN')
  @Mutation(() => SparePart)
  reactivateSparePart(@Args('id') id: string) {
    return this.inventoryService.reactivate(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'ALMACEN')
  @Mutation(() => StockMovement)
  registerStockMovement(
    @Args('input') input: CreateStockMovementInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.registerMovement(input, user);
  }

  /// Spec 016 RF-15/RF-20: mismo permiso que registrar el movimiento.
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'ALMACEN')
  @Mutation(() => [ProcedureChecklistItem])
  updateStockMovementChecklist(
    @Args('stockMovementId') stockMovementId: string,
    @Args({ name: 'items', type: () => [UpdateProcedureChecklistItemInput] })
    items: UpdateProcedureChecklistItemInput[],
  ) {
    return this.proceduresService.updateItems(
      'stockMovementId',
      stockMovementId,
      items,
    );
  }
}

/// Spec 016 RF-17: campo resuelto aparte porque `InventoryResolver` está
/// declarado sobre `SparePart`, no sobre `StockMovement`.
@Resolver(() => StockMovement)
export class StockMovementResolver {
  constructor(
    private readonly proceduresService: ProceduresService,
    private readonly inventoryService: InventoryService,
    private readonly vehiclesService: VehiclesService,
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
  ) {}

  @ResolveField(() => [ProcedureChecklistItem])
  procedureChecklistItems(@Parent() movement: StockMovement) {
    return this.proceduresService.listItems('stockMovementId', movement.id);
  }

  /// Spec 018: el reporte de movimientos necesita el nombre del artículo, no
  /// sólo su id.
  @ResolveField(() => SparePart)
  sparePart(@Parent() movement: StockMovement) {
    return this.inventoryService.findOne(movement.sparePartId);
  }

  @ResolveField(() => Vehicle, { nullable: true })
  vehicle(@Parent() movement: StockMovement) {
    return movement.vehicleId
      ? this.vehiclesService.findOne(movement.vehicleId)
      : null;
  }

  @ResolveField(() => MaintenanceOrder, { nullable: true })
  maintenanceOrder(@Parent() movement: StockMovement) {
    return movement.maintenanceOrderId
      ? this.maintenanceOrdersService.findOne(movement.maintenanceOrderId)
      : null;
  }
}
