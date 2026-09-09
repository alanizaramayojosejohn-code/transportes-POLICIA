import { ArgsType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** RF-12: filtro por unidad, estado (actual/histórica), rango de fechas y texto libre. */
@ArgsType()
export class UnitAssignmentFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitId?: string;

  /// true = sólo actuales, false = sólo históricas, ausente = todas.
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  current?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  take?: number;
}
