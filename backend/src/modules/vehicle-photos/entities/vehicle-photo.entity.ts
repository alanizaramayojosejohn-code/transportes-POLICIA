import { Field, ObjectType } from '@nestjs/graphql';

/** Tipo GraphQL de salida para VehiclePhoto. */
@ObjectType()
export class VehiclePhoto {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  slotKey!: string;

  @Field(() => String)
  dataUrl!: string;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => Date)
  updatedAt!: Date;
}
