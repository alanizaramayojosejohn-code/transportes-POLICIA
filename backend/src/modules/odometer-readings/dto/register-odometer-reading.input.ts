import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** RF-16 (spec 014): vehículo y valor son obligatorios. */
@InputType()
export class RegisterOdometerReadingInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  value!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
