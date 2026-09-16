import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString, Max, Min } from 'class-validator';
import { FuelType } from '../../../generated/prisma/enums.js';

/** RF-6: filtro por vehículo, tipo de combustible, rango de fechas y texto libre. */
@ArgsType()
export class FuelRecordFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => FuelType, { nullable: true })
  @IsOptional()
  fuelType?: FuelType;

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
