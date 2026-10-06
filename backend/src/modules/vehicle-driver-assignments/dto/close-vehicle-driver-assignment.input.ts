import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsString } from 'class-validator';

/** RF-7/RF-8 (spec 014): cierra el encargo vigente de un vehículo. */
@InputType()
export class CloseVehicleDriverAssignmentInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String)
  @IsDateString()
  endDate!: string;
}
