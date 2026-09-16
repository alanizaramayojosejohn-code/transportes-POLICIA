import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Trip } from './trip.entity.js';

@ObjectType()
export class TripPage {
  @Field(() => [Trip])
  items!: Trip[];

  @Field(() => Int)
  total!: number;
}
