import { Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { OdometerReadingsService } from './odometer-readings.service.js';

/// Extiende Vehicle con el último kilometraje conocido (spec 014, RF-17),
/// tomado del mayor valor entre recorridos, combustible y lecturas sueltas.
/// Vive aquí y no en VehiclesModule para que vehicles no dependa de
/// odometer-readings, mismo patrón que VehicleUnitResolver.
@Resolver(() => Vehicle)
export class VehicleOdometerResolver {
  constructor(
    private readonly odometerReadingsService: OdometerReadingsService,
  ) {}

  @ResolveField(() => Int, { nullable: true })
  lastOdometer(@Parent() vehicle: Vehicle) {
    return this.odometerReadingsService.getLatestForVehicle(vehicle.id);
  }
}
