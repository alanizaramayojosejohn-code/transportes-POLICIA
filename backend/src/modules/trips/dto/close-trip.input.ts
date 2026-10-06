import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** RF-5: kilometraje de llegada es obligatorio; el resto es opcional. */
@InputType()
export class CloseTripInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  returnAt?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  returnOdometer!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  returnFuelLevel?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  returnConditionNotes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  damagesFound?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  incidentNotes?: string;
}
