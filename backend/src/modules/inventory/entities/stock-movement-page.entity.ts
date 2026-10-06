import { Field, Int, ObjectType } from '@nestjs/graphql';
import { StockMovement } from './stock-movement.entity.js';

@ObjectType()
export class StockMovementPage {
  @Field(() => [StockMovement])
  items!: StockMovement[];

  @Field(() => Int)
  total!: number;
}
