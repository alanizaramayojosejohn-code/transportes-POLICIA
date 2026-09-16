import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { FuelType } from '../../../generated/prisma/enums.js';

registerEnumType(FuelType, {
  name: 'FuelType',
  description: 'Tipo de combustible de un abastecimiento.',
});

/**
 * Tipo GraphQL de salida para FuelRecord (spec 007). Los campos `Decimal`
 * del esquema (`quantity`, `unitPrice`, `totalCost`, `efficiencyKmPerUnit`)
 * viajan como `Float`: no hay escalar `Decimal` instalado en el proyecto
 * (AGENTS.md pide no agregar dependencias sin preguntar) y los montos de
 * este módulo no requieren precisión de más de 2-4 decimales. El valor
 * exacto sigue viviendo en la columna `Decimal` de Postgres; la conversión
 * a `number` ocurre sólo en el límite de FuelRecordsService al serializar.
 */
@ObjectType()
export class FuelRecord {
  @Field(() => String)
  id!: string;

  @Field(() => Date)
  suppliedAt!: Date;

  @Field(() => FuelType)
  fuelType!: FuelType;

  @Field(() => Float)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;

  @Field(() => Float)
  totalCost!: number;

  @Field(() => String, { nullable: true })
  station!: string | null;

  @Field(() => String, { nullable: true })
  ticketNumber!: string | null;

  @Field(() => Int)
  odometer!: number;

  @Field(() => Float, { nullable: true })
  efficiencyKmPerUnit!: number | null;

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => String, { nullable: true })
  driverId!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
