import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsString } from 'class-validator';

/** RF-08/RF-09: cierra la asignación vigente de un vehículo. */
@InputType()
export class CloseUnitAssignmentInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String)
  @IsDateString()
  endDate!: string;
}
