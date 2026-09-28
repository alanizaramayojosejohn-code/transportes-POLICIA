import { Field, Int, ObjectType } from '@nestjs/graphql';

/** Los cuatro indicadores de la maqueta (spec 019, RF-16). */
@ObjectType()
export class AuditSummary {
  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  today!: number;

  @Field(() => Int)
  created!: number;

  @Field(() => Int)
  updated!: number;
}
