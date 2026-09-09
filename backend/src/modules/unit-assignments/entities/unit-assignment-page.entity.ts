import { Field, Int, ObjectType } from '@nestjs/graphql';
import { UnitAssignment } from './unit-assignment.entity.js';

@ObjectType()
export class UnitAssignmentPage {
  @Field(() => [UnitAssignment])
  items!: UnitAssignment[];

  @Field(() => Int)
  total!: number;
}
