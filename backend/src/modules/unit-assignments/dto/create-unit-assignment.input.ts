import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/** RF-01/RF-02: vehículo, unidad y fecha de inicio son obligatorios. */
@InputType()
export class CreateUnitAssignmentInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String)
  @IsString()
  unitId!: string;

  /// `Field(() => String)` a propósito: GraphQL `Date` entregaría un objeto
  /// Date ya parseado, incompatible con `@IsDateString()`.
  @Field(() => String)
  @IsDateString()
  startDate!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  referenceDocument?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
