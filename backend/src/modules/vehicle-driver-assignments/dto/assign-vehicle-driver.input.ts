import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/** RF-1/RF-2 (spec 014): vehículo, conductor y fecha de inicio son obligatorios. */
@InputType()
export class AssignVehicleDriverInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String)
  @IsString()
  driverId!: string;

  /// `Field(() => String)` a propósito: GraphQL `Date` entregaría un objeto
  /// Date ya parseado, incompatible con `@IsDateString()`.
  @Field(() => String)
  @IsDateString()
  startDate!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  referenceDocument?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
