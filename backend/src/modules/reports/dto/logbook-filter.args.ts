import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString, Max, Min } from 'class-validator';
import { VehicleType } from '../../../generated/prisma/enums.js';

/**
 * Filtro de la bitácora de conductores: recorridos y cargas de combustible
 * combinados, filtrables por conductor, unidad, tipo de vehículo y rango de
 * fechas. `unitId` filtra por la unidad actual del vehículo (misma noción que
 * `VehicleFilterArgs.unitId`), no por `Personnel.unitId` del conductor.
 */
@ArgsType()
export class LogbookFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitId?: string;

  @Field(() => VehicleType, { nullable: true })
  @IsOptional()
  vehicleType?: VehicleType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @Min(1)
  @Max(200)
  take?: number;
}
