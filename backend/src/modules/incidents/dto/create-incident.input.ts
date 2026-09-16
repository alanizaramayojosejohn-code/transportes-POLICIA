import { Field, InputType } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import {
  IncidentType,
  VehicleConditionCode,
} from '../../../generated/prisma/enums.js';

/** RF-1: vehículo, tipo, fecha/hora, lugar y descripción son obligatorios. */
@InputType()
export class CreateIncidentInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string;

  @Field(() => IncidentType)
  @IsEnum(IncidentType)
  type!: IncidentType;

  /// `Field(() => String)` a propósito: igual que otras fechas de entrada en
  /// el proyecto, para poder usar `@IsDateString()`.
  @Field(() => String)
  @IsDateString()
  occurredAt!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 200)
  place!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 2000)
  description!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  damages?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  policeReportNumber?: string;

  /// RF-4: si se indica, además del incidente se agrega esta entrada al
  /// historial de condición del vehículo (VehiclesService.registerCondition).
  @Field(() => VehicleConditionCode, { nullable: true })
  @IsOptional()
  @IsEnum(VehicleConditionCode)
  postCondition?: VehicleConditionCode;
}
