import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Historial de a qué unidad perteneció cada vehículo (spec 003). Una fila
 * con `endDate` nulo es la asignación vigente; ninguna operación edita ni
 * borra una fila ya cerrada.
 */
@ObjectType()
export class UnitAssignment {
  @Field(() => String)
  id!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date, { nullable: true })
  endDate!: Date | null;

  @Field(() => String, { nullable: true })
  reason!: string | null;

  @Field(() => String, { nullable: true })
  referenceDocument!: string | null;

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => String)
  unitId!: string;
}
