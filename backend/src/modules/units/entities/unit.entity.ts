import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Tipo GraphQL de salida para Unit (spec 002). `parent`/`children` y el
 * encargado vigente/histórico se resuelven en UnitsResolver, nunca como
 * columnas propias.
 */
@ObjectType()
export class Unit {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  code!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  type!: string | null;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String, { nullable: true })
  parentId!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
