import { Field, Int, ObjectType } from '@nestjs/graphql';
import { VehicleDriverAssignment } from './vehicle-driver-assignment.entity.js';

@ObjectType()
export class VehicleDriverAssignmentPage {
  @Field(() => [VehicleDriverAssignment])
  items!: VehicleDriverAssignment[];

  @Field(() => Int)
  total!: number;
}
