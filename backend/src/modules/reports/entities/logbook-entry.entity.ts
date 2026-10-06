import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { FuelType } from '../../../generated/prisma/enums.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Personnel } from '../../personnel/entities/personnel.entity.js';

export enum LogbookEntryType {
  TRIP = 'TRIP',
  FUEL = 'FUEL',
}

registerEnumType(LogbookEntryType, {
  name: 'LogbookEntryType',
  description:
    'Distingue un recorrido de una carga de combustible dentro de la bitácora.',
});

/**
 * Fila unificada de la bitácora de conductores (reporte de Combustible):
 * mezcla `Trip` y `FuelRecord` en una sola línea de tiempo por vehículo o
 * conductor. `vehicle` y `driver` son los tipos completos de sus módulos
 * (no una proyección propia) para que los campos resueltos que ya tienen
 * (`Vehicle.currentUnit`, `Personnel.unit`, ...) sigan funcionando sin
 * duplicar resolvers aquí; ReportsService los llena ya hidratados desde
 * Prisma, así que no hacen falta @ResolveField adicionales.
 */
@ObjectType()
export class LogbookEntry {
  @Field(() => String)
  id!: string;

  @Field(() => LogbookEntryType)
  type!: LogbookEntryType;

  /// `departureAt` en un recorrido, `suppliedAt` en una carga.
  @Field(() => Date)
  occurredAt!: Date;

  @Field(() => Vehicle)
  vehicle!: Vehicle;

  @Field(() => Personnel, { nullable: true })
  driver!: Personnel | null;

  /// Sólo recorridos.
  @Field(() => String, { nullable: true })
  destination!: string | null;

  @Field(() => Date, { nullable: true })
  returnAt!: Date | null;

  @Field(() => Int, { nullable: true })
  distanceKm!: number | null;

  @Field(() => Int, { nullable: true })
  departureOdometer!: number | null;

  @Field(() => Int, { nullable: true })
  returnOdometer!: number | null;

  /// Sólo cargas de combustible.
  @Field(() => FuelType, { nullable: true })
  fuelType!: FuelType | null;

  @Field(() => Float, { nullable: true })
  quantity!: number | null;

  @Field(() => Float, { nullable: true })
  totalCost!: number | null;

  @Field(() => String, { nullable: true })
  station!: string | null;

  @Field(() => Int, { nullable: true })
  odometer!: number | null;
}
