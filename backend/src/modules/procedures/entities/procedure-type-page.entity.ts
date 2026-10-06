import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ProcedureType } from './procedure-type.entity.js';

@ObjectType()
export class ProcedureTypePage {
  @Field(() => [ProcedureType])
  items!: ProcedureType[];

  @Field(() => Int)
  total!: number;
}
