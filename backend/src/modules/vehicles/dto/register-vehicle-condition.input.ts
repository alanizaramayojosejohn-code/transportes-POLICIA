import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleConditionCode } from '../../../generated/prisma/enums.js';

/**
 * RF-05: el motivo es recomendado, no obligatorio (caso límite del spec).
 * `code` sólo admite los valores que este módulo puede escribir; "En
 * mantenimiento" y "Separado por incidente" no existen en el enum (RF-06).
 */
@InputType()
export class RegisterVehicleConditionInput {
  @Field(() => VehicleConditionCode)
  @IsEnum(VehicleConditionCode)
  code!: VehicleConditionCode;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}
