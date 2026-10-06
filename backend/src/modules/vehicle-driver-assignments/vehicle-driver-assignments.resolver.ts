import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { VehicleDriverAssignmentsService } from './vehicle-driver-assignments.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { PersonnelService } from '../personnel/personnel.service.js';
import { VehicleDriverAssignment } from './entities/vehicle-driver-assignment.entity.js';
import { VehicleDriverAssignmentPage } from './entities/vehicle-driver-assignment-page.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Personnel } from '../personnel/entities/personnel.entity.js';
import { AssignVehicleDriverInput } from './dto/assign-vehicle-driver.input.js';
import { CloseVehicleDriverAssignmentInput } from './dto/close-vehicle-driver-assignment.input.js';
import { VehicleDriverAssignmentFilterArgs } from './dto/vehicle-driver-assignment-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { unitScopeFor } from '../../common/unit-scope.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Resolver(() => VehicleDriverAssignment)
export class VehicleDriverAssignmentsResolver {
  constructor(
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly personnelService: PersonnelService,
  ) {}

  @Query(() => VehicleDriverAssignmentPage, {
    name: 'vehicleDriverAssignments',
  })
  findAll(@Args() filters: VehicleDriverAssignmentFilterArgs) {
    return this.vehicleDriverAssignmentsService.findAll(filters);
  }

  /// RF-15 (spec 014): «Mi vehículo» para el rol CONDUCTOR. `null` cuando la
  /// cuenta no tiene ficha de personal o no tiene vehículo a cargo vigente.
  @Query(() => VehicleDriverAssignment, {
    name: 'myVehicleAssignment',
    nullable: true,
  })
  myVehicleAssignment(@CurrentUser() user: AuthenticatedUser) {
    if (!user.personnelId) {
      return null;
    }
    return this.vehicleDriverAssignmentsService.getCurrentForDriver(
      user.personnelId,
    );
  }

  @ResolveField(() => Vehicle)
  vehicle(@Parent() assignment: VehicleDriverAssignment) {
    return this.vehiclesService.findOne(assignment.vehicleId);
  }

  @ResolveField(() => Personnel)
  driver(@Parent() assignment: VehicleDriverAssignment) {
    return this.personnelService.findOne(assignment.driverId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => VehicleDriverAssignment)
  assignVehicleDriver(
    @Args('input') input: AssignVehicleDriverInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehicleDriverAssignmentsService.assign(
      input,
      unitScopeFor(user),
    );
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => VehicleDriverAssignment)
  closeVehicleDriverAssignment(
    @Args('input') input: CloseVehicleDriverAssignmentInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehicleDriverAssignmentsService.close(
      input,
      unitScopeFor(user),
    );
  }
}
