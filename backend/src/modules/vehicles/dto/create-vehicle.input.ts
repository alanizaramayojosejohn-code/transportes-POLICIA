import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../../../generated/prisma/enums.js';
import { ProcedureChecklistItemInput } from '../../procedures/dto/procedure-checklist-item.input.js';

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

  /** Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar. */
  @Field(() => [ProcedureChecklistItemInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureChecklistItemInput)
  checklistItems?: ProcedureChecklistItemInput[];
}
