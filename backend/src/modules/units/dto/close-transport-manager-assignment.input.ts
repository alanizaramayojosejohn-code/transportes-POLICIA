import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsString } from 'class-validator';

/** RF-23: cierra la designación vigente de una unidad. */
@InputType()
export class CloseTransportManagerAssignmentInput {
  @Field(() => String)
  @IsString()
  unitId!: string;

  @Field(() => String)
  @IsDateString()
  endDate!: string;
}
