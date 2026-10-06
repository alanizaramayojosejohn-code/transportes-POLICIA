import { Field, ObjectType } from '@nestjs/graphql';

/** Catálogo de categorías de repuestos (spec 009). */
@ObjectType()
export class SparePartCategory {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;
}
