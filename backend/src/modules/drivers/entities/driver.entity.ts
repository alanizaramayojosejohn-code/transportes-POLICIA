import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Tipo GraphQL de salida para Driver (spec 005). `unit` viaja como campo
 * resuelto (DriversResolver), igual que `role` en User.
 */
@ObjectType()
export class Driver {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String)
  ci!: string;

  @Field(() => String, { nullable: true })
  rank!: string | null;

  @Field(() => String)
  licenseNumber!: string;

  @Field(() => String)
  licenseCategory!: string;

  @Field(() => Date)
  licenseExpiresAt!: Date;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String, { nullable: true })
  unitId!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
