import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FuelType } from '../../../generated/prisma/enums.js';
import { ProcedureChecklistItemInput } from '../../procedures/dto/procedure-checklist-item.input.js';

/** RF-1: vehículo, fecha, tipo, cantidad, precio unitario y kilometraje son obligatorios. */
@InputType()
export class CreateFuelRecordInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string;

  @Field(() => String)
  @IsDateString()
  suppliedAt!: string;

  @Field(() => FuelType)
  @IsEnum(FuelType)
  fuelType!: FuelType;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  station?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  odometer!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  /** Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar. */
  @Field(() => [ProcedureChecklistItemInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureChecklistItemInput)
  checklistItems?: ProcedureChecklistItemInput[];
}
