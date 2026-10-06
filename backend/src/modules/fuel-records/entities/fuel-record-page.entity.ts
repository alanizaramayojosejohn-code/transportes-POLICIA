import { Field, Int, ObjectType } from '@nestjs/graphql';
import { FuelRecord } from './fuel-record.entity.js';

@ObjectType()
export class FuelRecordPage {
  @Field(() => [FuelRecord])
  items!: FuelRecord[];

  @Field(() => Int)
  total!: number;
}
