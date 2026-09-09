import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Officer } from './officer.entity.js';

@ObjectType()
export class OfficerPage {
  @Field(() => [Officer])
  items!: Officer[];

  @Field(() => Int)
  total!: number;
}
