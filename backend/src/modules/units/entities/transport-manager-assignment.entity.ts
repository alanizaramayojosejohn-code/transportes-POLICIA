import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Historial de encargados de transportes por unidad (spec 002, RF-18 a
 * RF-25). Una fila con `endDate` nulo es la designación vigente; nunca se
 * edita ni se borra una fila ya cerrada.
 */
@ObjectType()
export class TransportManagerAssignment {
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
  unitId!: string;

  @Field(() => String)
  officerId!: string;
}
