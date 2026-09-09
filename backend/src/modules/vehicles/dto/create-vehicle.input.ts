import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { VehicleType } from '../../../generated/prisma/enums.js';

/**
 * RF-01/RF-03: placa y tipo son los únicos campos obligatorios; el resto se
 * completa cuando se conoce.
 */
@InputType()
export class CreateVehicleInput {
  @Field(() => String)
  @IsString()
  @Length(1, 20)
  plate!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  plateDnfr?: string;

  @Field(() => VehicleType)
  @IsEnum(VehicleType)
  type!: VehicleType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  brand?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  model?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  year?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  color?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  chassisNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  engineNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  origin?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  receptionSource?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  observations?: string;
}
