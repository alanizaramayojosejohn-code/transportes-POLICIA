import { Field, Int, ObjectType } from '@nestjs/graphql';
import { LogbookEntry } from './logbook-entry.entity.js';

@ObjectType()
export class LogbookPage {
  @Field(() => [LogbookEntry])
  items!: LogbookEntry[];

  @Field(() => Int)
  total!: number;
}
