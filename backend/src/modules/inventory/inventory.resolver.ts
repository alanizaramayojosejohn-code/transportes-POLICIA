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
import { CreateSparePartInput } from './dto/create-spare-part.input.js';
import { UpdateSparePartInput } from './dto/update-spare-part.input.js';
import { SparePartFilterArgs } from './dto/spare-part-filter.args.js';
import { CreateStockMovementInput } from './dto/create-stock-movement.input.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Puerta GraphQL del módulo (spec 009). La consulta está abierta a
 * cualquier rol; ADMINISTRADOR, TRANSPORTES y ALMACEN pueden escribir.
 */
@Resolver(() => SparePart)
export class InventoryResolver {
  constructor(private readonly inventoryService: InventoryService) {}

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
}
