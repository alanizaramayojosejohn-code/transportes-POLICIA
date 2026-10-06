import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Personnel } from './personnel.entity.js';

/** Página de resultados con el total sin paginar, mismo patrón que `UserPage`. */
@ObjectType()
export class PersonnelPage {
  @Field(() => [Personnel])
  items!: Personnel[];

  @Field(() => Int)
  total!: number;
}
