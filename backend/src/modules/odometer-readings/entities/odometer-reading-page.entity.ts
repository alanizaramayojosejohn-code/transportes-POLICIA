import { Field, Int, ObjectType } from '@nestjs/graphql';
import { OdometerReading } from './odometer-reading.entity.js';

@ObjectType()
export class OdometerReadingPage {
  @Field(() => [OdometerReading])
  items!: OdometerReading[];

  @Field(() => Int)
  total!: number;
}
