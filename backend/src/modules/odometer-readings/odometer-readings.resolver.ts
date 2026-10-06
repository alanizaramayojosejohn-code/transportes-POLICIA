import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OdometerReadingsService } from './odometer-readings.service.js';
import { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service.js';
import { OdometerReading } from './entities/odometer-reading.entity.js';
import { OdometerReadingPage } from './entities/odometer-reading-page.entity.js';
import { RegisterOdometerReadingInput } from './dto/register-odometer-reading.input.js';
import { OdometerReadingFilterArgs } from './dto/odometer-reading-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Resolver(() => OdometerReading)
export class OdometerReadingsResolver {
  constructor(
    private readonly odometerReadingsService: OdometerReadingsService,
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
  ) {}

  @Query(() => OdometerReadingPage, { name: 'odometerReadings' })
  findAll(@Args() filters: OdometerReadingFilterArgs) {
    return this.odometerReadingsService.findAll(filters);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES', 'CONDUCTOR')
  @Mutation(() => OdometerReading)
  async registerOdometerReading(
    @Args('input') input: RegisterOdometerReadingInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role === 'CONDUCTOR') {
      await this.vehicleDriverAssignmentsService.assertDriverOwnsVehicle(
        user.personnelId,
        input.vehicleId,
      );
    }
    return this.odometerReadingsService.register(input, user);
  }
}
