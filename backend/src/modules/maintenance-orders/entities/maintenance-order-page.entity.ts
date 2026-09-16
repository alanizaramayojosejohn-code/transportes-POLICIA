import { Field, Int, ObjectType } from '@nestjs/graphql';
import { MaintenanceOrder } from './maintenance-order.entity.js';

@ObjectType()
export class MaintenanceOrderPage {
  @Field(() => [MaintenanceOrder])
  items!: MaintenanceOrder[];

  @Field(() => Int)
  total!: number;
}
