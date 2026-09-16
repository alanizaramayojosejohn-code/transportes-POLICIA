import { Field, Int, ObjectType } from '@nestjs/graphql';
import { SparePart } from './spare-part.entity.js';

@ObjectType()
export class SparePartPage {
  @Field(() => [SparePart])
  items!: SparePart[];

  @Field(() => Int)
  total!: number;
}
