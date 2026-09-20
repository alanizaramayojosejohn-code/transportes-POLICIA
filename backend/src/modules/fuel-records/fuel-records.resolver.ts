import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FuelRecordsService } from './fuel-records.service.js';
import { FuelRecord } from './entities/fuel-record.entity.js';
import { FuelRecordPage } from './entities/fuel-record-page.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Personnel } from '../personnel/entities/personnel.entity.js';
import { CreateFuelRecordInput } from './dto/create-fuel-record.input.js';
import { FuelRecordFilterArgs } from './dto/fuel-record-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Puerta GraphQL del módulo (spec 007). La consulta está abierta a
 * cualquier rol; ADMINISTRADOR, TRANSPORTES y COMBUSTIBLE pueden registrar
 * abastecimientos.
 */
@Resolver(() => FuelRecord)
export class FuelRecordsResolver {
  constructor(private readonly fuelRecordsService: FuelRecordsService) {}

  @Query(() => FuelRecordPage, { name: 'fuelRecords' })
  findAll(@Args() filters: FuelRecordFilterArgs) {
    return this.fuelRecordsService.findAll(filters);
  }

  @Query(() => FuelRecord, { name: 'fuelRecord' })
  findOne(@Args('id') id: string) {
    return this.fuelRecordsService.findOne(id);
  }

  @ResolveField(() => Vehicle)
  vehicle(@Parent() record: FuelRecord) {
    return this.fuelRecordsService.getVehicle(record.vehicleId);
  }

  @ResolveField(() => Personnel, { nullable: true })
  driver(@Parent() record: FuelRecord) {
    return this.fuelRecordsService.getDriver(record.driverId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'COMBUSTIBLE', 'CONDUCTOR')
  @Mutation(() => FuelRecord)
  createFuelRecord(
    @Args('input') input: CreateFuelRecordInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fuelRecordsService.create(input, user);
  }
}
