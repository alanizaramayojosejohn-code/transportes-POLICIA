import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Tipo GraphQL de salida para User (spec 004). No declara un campo para
 * `passwordHash`: RF-12 exige que ninguna consulta lo exponga, así que ni
 * siquiera existe la posibilidad de pedirlo desde el cliente. `role` viaja
 * como campo resuelto (UsersResolver), igual que `currentUnit` en Officer.
 */
@ObjectType()
export class User {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  username!: string;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String)
  fullName!: string;

  @Field(() => String, { nullable: true })
  rank!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date, { nullable: true })
  lastLoginAt!: Date | null;

  @Field(() => String)
  roleId!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
