import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service.js';
import { Driver } from './entities/driver.entity.js';
import { DriverPage } from './entities/driver-page.entity.js';
import { Unit } from '../units/entities/unit.entity.js';
import { CreateDriverInput } from './dto/create-driver.input.js';
import { UpdateDriverInput } from './dto/update-driver.input.js';
import { DriverFilterArgs } from './dto/driver-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Puerta GraphQL del módulo (spec 005). La consulta está abierta a
 * cualquier rol; sólo ADMINISTRADOR y TRANSPORTES pueden escribir, mismo
 * patrón que vehículos y unidades.
 */
@Resolver(() => Driver)
export class DriversResolver {
  constructor(private readonly driversService: DriversService) {}

  @Query(() => DriverPage, { name: 'drivers' })
  findAll(@Args() filters: DriverFilterArgs) {
    return this.driversService.findAll(filters);
  }

  @Query(() => Driver, { name: 'driver' })
  findOne(@Args('id') id: string) {
    return this.driversService.findOne(id);
  }

  @ResolveField(() => Unit, { nullable: true })
  unit(@Parent() driver: Driver) {
    return this.driversService.getUnit(driver.unitId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Driver)
  createDriver(@Args('input') input: CreateDriverInput) {
    return this.driversService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Driver)
  updateDriver(
    @Args('id') id: string,
    @Args('input') input: UpdateDriverInput,
  ) {
    return this.driversService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Driver)
  deactivateDriver(@Args('id') id: string) {
    return this.driversService.deactivate(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Driver)
  reactivateDriver(@Args('id') id: string) {
    return this.driversService.reactivate(id);
  }
}
