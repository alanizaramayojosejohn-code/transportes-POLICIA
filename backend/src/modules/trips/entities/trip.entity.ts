import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Tipo GraphQL de salida para Trip (spec 006). `vehicle`, `driver` y
 * `destination` viajan como campos resueltos (TripsResolver) a través de
 * `assignmentId`: el cliente no necesita saber que por detrás existen
 * `Assignment`/`VehicleRequest`, sólo ve un recorrido.
 */
@ObjectType()
export class Trip {
  @Field(() => String)
  id!: string;

  @Field(() => Date)
  departureAt!: Date;

  @Field(() => Int)
  departureOdometer!: number;

  @Field(() => Int, { nullable: true })
  departureFuelLevel!: number | null;

  @Field(() => String, { nullable: true })
  departureConditionNotes!: string | null;

  @Field(() => Date, { nullable: true })
  returnAt!: Date | null;

  @Field(() => Int, { nullable: true })
  returnOdometer!: number | null;

  @Field(() => Int, { nullable: true })
  returnFuelLevel!: number | null;

  @Field(() => String, { nullable: true })
  returnConditionNotes!: string | null;

  @Field(() => String, { nullable: true })
  damagesFound!: string | null;

  @Field(() => String, { nullable: true })
  incidentNotes!: string | null;

  @Field(() => Int, { nullable: true })
  distanceKm!: number | null;

  @Field(() => String)
  assignmentId!: string;

  @Field(() => Date)
  createdAt!: Date;
}
