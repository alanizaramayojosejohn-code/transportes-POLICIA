import { Field, Int, ObjectType } from '@nestjs/graphql';
import { VehicleDocument } from './vehicle-document.entity.js';

@ObjectType()
export class VehicleDocumentPage {
  @Field(() => [VehicleDocument])
  items!: VehicleDocument[];

  @Field(() => Int)
  total!: number;
}
