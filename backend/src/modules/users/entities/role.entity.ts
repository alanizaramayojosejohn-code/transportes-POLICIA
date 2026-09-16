import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Catálogo de roles (spec 004). Sólo se exponen código y nombre: es lo que
 * consumen el selector del formulario de usuario y la columna de rol del
 * listado; `description` e `isSystem` no tienen pantalla propia todavía.
 */
@ObjectType()
export class Role {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;
}
