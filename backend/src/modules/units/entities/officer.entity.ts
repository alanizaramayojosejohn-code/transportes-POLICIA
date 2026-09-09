import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Personal policial mínimo para poder designarlo encargado de transportes
 * (spec 002). No es el padrón de conductores.
 */
@ObjectType()
export class Officer {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  ci!: string;

  @Field(() => String)
  ciComplement!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String, { nullable: true })
  rank!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String, { nullable: true })
  currentUnitId!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
