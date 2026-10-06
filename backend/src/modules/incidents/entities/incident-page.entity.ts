import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Incident } from './incident.entity.js';

@ObjectType()
export class IncidentPage {
  @Field(() => [Incident])
  items!: Incident[];

  @Field(() => Int)
  total!: number;
}
