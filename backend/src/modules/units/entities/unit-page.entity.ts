import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Unit } from './unit.entity.js';

@ObjectType()
export class UnitPage {
  @Field(() => [Unit])
  items!: Unit[];

  @Field(() => Int)
  total!: number;
}
