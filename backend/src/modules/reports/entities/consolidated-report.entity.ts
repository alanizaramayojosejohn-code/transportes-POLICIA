import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum ReportGroupBy {
  VEHICLE = 'VEHICLE',
  UNIT = 'UNIT',
}

registerEnumType(ReportGroupBy, {
  name: 'ReportGroupBy',
  description:
    'Cómo se consolidan las filas de un reporte: una por vehículo, o una por la unidad a la que el vehículo está asignado hoy (spec 018).',
});

/// Id de la fila que junta a los vehículos sin asignación de unidad vigente.
/// No es un id real de `Unit`: no existe una unidad «sin unidad».
export const NO_UNIT_GROUP_ID = 'SIN_UNIDAD';

/**
 * Columnas de identificación comunes a los tres reportes consolidados
 * (combustible, mantenimiento y kilometraje). Cada reporte agrega sus propias
 * métricas; esto es sólo «de qué es esta fila».
 */
@ObjectType({ isAbstract: true })
export abstract class ConsolidatedReportRow {
  /// Id del vehículo o de la unidad, según el `groupBy` del pedido.
  @Field(() => String)
  groupId!: string;

  /// Placa del vehículo o nombre de la unidad.
  @Field(() => String)
  groupLabel!: string;

  /// Marca, modelo y unidad vigente cuando se agrupa por vehículo; nulo
  /// cuando se agrupa por unidad (la etiqueta ya dice todo).
  @Field(() => String, { nullable: true })
  groupDetail!: string | null;

  /// Cuántos vehículos distintos aportan a la fila: siempre 1 agrupando por
  /// vehículo, y la razón por la que un promedio por unidad es interpretable.
  @Field(() => Int)
  vehicleCount!: number;
}
