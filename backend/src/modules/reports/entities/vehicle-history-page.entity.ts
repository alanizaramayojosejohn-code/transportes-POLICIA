import { Field, Int, ObjectType } from '@nestjs/graphql';
import { VehicleHistoryEntry } from './vehicle-history-entry.entity.js';

@ObjectType()
export class VehicleHistoryPage {
  @Field(() => [VehicleHistoryEntry])
  items!: VehicleHistoryEntry[];

  @Field(() => Int)
  total!: number;
}
