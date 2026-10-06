import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString, Max, Min } from 'class-validator';
import { VehicleType } from '../../../generated/prisma/enums.js';
import { ReportGroupBy } from '../entities/consolidated-report.entity.js';

/**
 * Filtro común de los tres reportes consolidados (spec 018): mismo recorte de
 * flota (vehículo, unidad, tipo), mismo rango de fechas y misma paginación en
 * los tres, para que cambiar de pestaña no obligue a reaprender los filtros.
 * `unitId` es la unidad vigente del vehículo (misma noción que en
 * `VehicleFilterArgs`), y se combina con el alcance por unidad del usuario sin
 * pisarlo (spec 015).
 */
@ArgsType()
export class ConsolidatedReportFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitId?: string;

  @Field(() => VehicleType, { nullable: true })
  @IsOptional()
  vehicleType?: VehicleType;

  @Field(() => ReportGroupBy, {
    nullable: true,
    defaultValue: ReportGroupBy.VEHICLE,
  })
  @IsOptional()
  groupBy?: ReportGroupBy;

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
