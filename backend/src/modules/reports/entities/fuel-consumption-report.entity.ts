import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ConsolidatedReportRow } from './consolidated-report.entity.js';

/**
 * Consumo de combustible consolidado de un vehículo o de una unidad en el
 * rango pedido (spec 018). Los kilómetros son los de los recorridos del mismo
 * rango: es lo que hace comparable el rendimiento entre vehículos, aunque no
 * coincida con el `efficiencyKmPerUnit` que cada carga guarda contra la carga
 * anterior (ese es puntual, este es del periodo).
 */
@ObjectType()
export class FuelConsumptionRow extends ConsolidatedReportRow {
  /// Cargas registradas en el rango.
  @Field(() => Int)
  records!: number;

  /// Litros (o metros cúbicos en GNV) cargados.
  @Field(() => Float)
  liters!: number;

  @Field(() => Float)
  totalCost!: number;

  /// Importe sobre litros. Nulo si no hay litros con los que dividir.
  @Field(() => Float, { nullable: true })
  avgUnitPrice!: number | null;

  /// Kilómetros recorridos en el mismo rango, de los recorridos cerrados.
  @Field(() => Int)
  distanceKm!: number;

  /// Kilómetros sobre litros del periodo. Nulo si falta alguno de los dos.
  @Field(() => Float, { nullable: true })
  efficiencyKmPerLiter!: number | null;
}

@ObjectType()
export class FuelConsumptionReport {
  @Field(() => [FuelConsumptionRow])
  items!: FuelConsumptionRow[];

  /// Filas del reporte antes de paginar, no cargas: lo que cuenta el pie de
  /// la tabla para saber cuántas páginas hay.
  @Field(() => Int)
  total!: number;

  /// Totales de todo el resultado filtrado, no sólo de la página visible.
  @Field(() => Int)
  totalRecords!: number;

  @Field(() => Float)
  totalLiters!: number;

  @Field(() => Float)
  totalCost!: number;

  @Field(() => Int)
  totalDistanceKm!: number;

  @Field(() => Float, { nullable: true })
  totalEfficiencyKmPerLiter!: number | null;
}
