import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MonthlyTripCount {
  /// Formato "YYYY-MM", ordenado de más antiguo a más reciente.
  @Field(() => String)
  month!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class FleetStatusBreakdown {
  @Field(() => Int)
  operational!: number;

  @Field(() => Int)
  maintenance!: number;

  @Field(() => Int)
  inoperable!: number;

  @Field(() => Int)
  other!: number;
}

/** Resumen del panel principal (spec 012). Sólo lectura, sin mutaciones. */
@ObjectType()
export class DashboardSummary {
  @Field(() => Int)
  vehicleCount!: number;

  @Field(() => Int)
  operationalVehicleCount!: number;

  @Field(() => Int)
  activeDriverCount!: number;

  @Field(() => Int)
  tripsThisMonthCount!: number;

  @Field(() => Int)
  openTripsCount!: number;

  @Field(() => Int)
  lowStockCount!: number;

  @Field(() => Int)
  inProgressMaintenanceCount!: number;

  @Field(() => [MonthlyTripCount])
  tripsByMonth!: MonthlyTripCount[];

  @Field(() => FleetStatusBreakdown)
  fleetStatus!: FleetStatusBreakdown;
}
