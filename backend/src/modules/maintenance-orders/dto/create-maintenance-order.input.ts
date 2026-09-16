import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { MaintenanceType } from '../../../generated/prisma/enums.js';

/** RF-1: vehículo, tipo, kilometraje y descripción son obligatorios. */
@InputType()
export class CreateMaintenanceOrderInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => MaintenanceType)
  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  workshopName?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  odometer!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @Field(() => String)
  @IsString()
  @Length(1, 2000)
  description!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;
}
