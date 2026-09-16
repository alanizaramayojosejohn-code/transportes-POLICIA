import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FuelType } from '../../../generated/prisma/enums.js';

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
}
