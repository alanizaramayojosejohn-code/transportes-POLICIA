import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

/** RF-1: vehículo, conductor, destino, fecha y kilometraje de salida son obligatorios. */
@InputType()
export class CreateTripInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String)
  @IsString()
  driverId!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 200)
  destination!: string;

  /// `Field(() => String)` a propósito: igual que `startDate` en
  /// CreateUnitAssignmentInput, para poder usar `@IsDateString()`.
  @Field(() => String)
  @IsDateString()
  departureAt!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  departureOdometer!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  departureFuelLevel?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  departureConditionNotes?: string;
}
