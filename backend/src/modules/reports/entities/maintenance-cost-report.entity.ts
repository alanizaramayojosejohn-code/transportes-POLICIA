import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ConsolidatedReportRow } from './consolidated-report.entity.js';

/**
 * Costo de mantenimiento consolidado de un vehículo o de una unidad en el
 * rango pedido (spec 018). El rango se aplica a la fecha de registro de la
 * orden (`createdAt`), no a `finishedAt`: así una orden abierta también entra
 * en el periodo en que se abrió. Las órdenes anuladas (`CANCELLED`) no
 * cuentan: no son un costo.
 */
@ObjectType()
export class MaintenanceCostRow extends ConsolidatedReportRow {
  @Field(() => Int)
  orders!: number;

  @Field(() => Int)
  preventive!: number;

  @Field(() => Int)
  corrective!: number;

  @Field(() => Float)
  totalCost!: number;

  /// Costo sobre órdenes. Nulo si no hay órdenes con las que dividir.
  @Field(() => Float, { nullable: true })
  avgCost!: number | null;
}

@ObjectType()
export class MaintenanceCostReport {
  @Field(() => [MaintenanceCostRow])
  items!: MaintenanceCostRow[];

  /// Filas antes de paginar, no órdenes.
  @Field(() => Int)
  total!: number;

  /// Totales de todo el resultado filtrado, no sólo de la página visible.
  @Field(() => Int)
  totalOrders!: number;

  @Field(() => Int)
  totalPreventive!: number;

  @Field(() => Int)
  totalCorrective!: number;

  @Field(() => Float)
  totalCost!: number;
}
