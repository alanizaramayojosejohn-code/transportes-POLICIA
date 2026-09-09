import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { VehicleType } from '../../../generated/prisma/enums.js';
import { VehicleConditionCode } from '../../../generated/prisma/enums.js';

/**
 * Filtros de listado (RF-09): por condición vigente, unidad actual, tipo y
 * texto libre sobre placa/marca/modelo/chasis.
 */
@ArgsType()
export class VehicleFilterArgs {
  @Field(() => VehicleConditionCode, { nullable: true })
  @IsOptional()
  @IsEnum(VehicleConditionCode)
  condition?: VehicleConditionCode;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitId?: string;

  @Field(() => VehicleType, { nullable: true })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

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
