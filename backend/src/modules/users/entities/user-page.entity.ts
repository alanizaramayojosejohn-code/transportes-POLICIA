import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from './user.entity.js';

/**
 * Página de resultados con el total sin paginar, para que la tabla del
 * cliente pueda calcular cuántas páginas hay sin pedirlas todas.
 */
@ObjectType()
export class UserPage {
  @Field(() => [User])
  items!: User[];

  @Field(() => Int)
  total!: number;
}
