import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Driver } from './driver.entity.js';

/**
 * Página de resultados con el total sin paginar, mismo patrón que
 * `UserPage` (spec 004).
 */
@ObjectType()
export class DriverPage {
  @Field(() => [Driver])
  items!: Driver[];

  @Field(() => Int)
  total!: number;
}
