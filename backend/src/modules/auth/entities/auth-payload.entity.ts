import { Field, ObjectType } from '@nestjs/graphql';

/** Datos mínimos del usuario logueado que necesita el frontend (spec 013). */
@ObjectType()
export class AuthUser {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  username!: string;

  @Field(() => String)
  fullName!: string;

  @Field(() => String)
  role!: string;
}

@ObjectType()
export class AuthPayload {
  @Field(() => String)
  accessToken!: string;

  @Field(() => AuthUser)
  user!: AuthUser;
}
