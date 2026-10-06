import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Historial de qué conductor está a cargo de cada vehículo (spec 014). Una
 * fila con `endDate` nulo es la designación vigente; ninguna operación edita
 * ni borra una fila ya cerrada.
 */
@ObjectType()
export class VehicleDriverAssignment {
  @Field(() => String)
  id!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date, { nullable: true })
  endDate!: Date | null;

  @Field(() => String, { nullable: true })
  referenceDocument!: string | null;

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => String)
  driverId!: string;
}
