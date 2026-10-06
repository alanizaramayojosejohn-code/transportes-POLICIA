import { ArgsType, Field, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { StockMovementType } from '../../../generated/prisma/enums.js';

/**
 * Filtro del listado de movimientos de almacén (spec 018, reporte «Movimientos
 * de almacén»): por artículo, vehículo destino, tipo de movimiento y rango de
 * fechas. No existía como listado propio antes de este spec — sólo se leía
 * anidado bajo un artículo.
 */
@ArgsType()
export class StockMovementFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sparePartId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => StockMovementType, { nullable: true })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

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

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  take?: number;
}
