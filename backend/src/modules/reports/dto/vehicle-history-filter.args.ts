import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString, Max, Min } from 'class-validator';
import { VehicleHistoryEntryType } from '../entities/vehicle-history-entry.entity.js';

/**
 * Filtro del historial integral del vehículo (spec 018). `vehicleId` es
 * obligatorio para ADMINISTRADOR/CONSULTA/TRANSPORTES (el resolver valida
 * esto, no `class-validator`, porque la obligatoriedad depende del rol) y se
 * ignora para CONDUCTOR, que siempre ve el vehículo del que está a cargo.
 */
@ArgsType()
export class VehicleHistoryFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => [VehicleHistoryEntryType], { nullable: true })
  @IsOptional()
  types?: VehicleHistoryEntryType[];

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
