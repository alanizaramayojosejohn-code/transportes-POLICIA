import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Tipo GraphQL de salida para Personnel (fusión de specs 002 y 005: personal
 * policial + padrón de conductores). `isDriver`/`isOfficer`/`isAdmin` son
 * independientes entre sí: una misma persona puede ejercer uno, varios o
 * ninguno con el tiempo. `unit` viaja como campo resuelto
 * (PersonnelResolver), igual que `role` en User.
 */
@ObjectType()
export class Personnel {
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

  @Field(() => Boolean)
  isDriver!: boolean;

  @Field(() => Boolean)
  isOfficer!: boolean;

  @Field(() => Boolean)
  isAdmin!: boolean;

  @Field(() => String, { nullable: true })
  licenseNumber!: string | null;

  @Field(() => String, { nullable: true })
  licenseCategory!: string | null;

  @Field(() => Date, { nullable: true })
  licenseExpiresAt!: Date | null;

  @Field(() => String, { nullable: true })
  observations!: string | null;

  @Field(() => String, { nullable: true })
  unitId!: string | null;

  @Field(() => String, { nullable: true })
  userId!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
