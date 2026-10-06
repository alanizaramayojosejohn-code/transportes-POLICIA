import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ConsolidatedReportRow } from './consolidated-report.entity.js';

/**
 * Kilometraje recorrido consolidado de un vehículo o de una unidad en el rango
 * pedido (spec 018). El rango se aplica a la fecha de salida (`departureAt`):
 * un recorrido que todavía no retornó cuenta como salida del periodo, pero no
 * aporta kilómetros (la distancia sólo existe al cerrar el recorrido).
 */
@ObjectType()
export class MileageRow extends ConsolidatedReportRow {
  /// Salidas registradas en el rango, cerradas o no.
  @Field(() => Int)
  trips!: number;

  /// De esas salidas, cuántas ya retornaron.
  @Field(() => Int)
  closedTrips!: number;

  @Field(() => Int)
  distanceKm!: number;

  /// Kilómetros sobre recorridos cerrados (los abiertos no tienen distancia).
  /// Nulo si ninguno cerró todavía.
  @Field(() => Float, { nullable: true })
  avgDistanceKm!: number | null;
}

@ObjectType()
export class MileageReport {
  @Field(() => [MileageRow])
  items!: MileageRow[];

  /// Filas antes de paginar, no recorridos.
  @Field(() => Int)
  total!: number;

  /// Totales de todo el resultado filtrado, no sólo de la página visible.
  @Field(() => Int)
  totalTrips!: number;

  @Field(() => Int)
  totalClosedTrips!: number;

  @Field(() => Int)
  totalDistanceKm!: number;
}
