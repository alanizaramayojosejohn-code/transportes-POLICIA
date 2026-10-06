import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  FuelType,
  IncidentSeverity,
  IncidentType,
  MaintenanceStatus,
  MaintenanceType,
  StockMovementType,
} from '../../../generated/prisma/enums.js';
import { Personnel } from '../../personnel/entities/personnel.entity.js';

export enum VehicleHistoryEntryType {
  UNIT_ASSIGNMENT = 'UNIT_ASSIGNMENT',
  DRIVER_ASSIGNMENT = 'DRIVER_ASSIGNMENT',
  TRIP = 'TRIP',
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  INCIDENT = 'INCIDENT',
  STOCK_MOVEMENT = 'STOCK_MOVEMENT',
}

registerEnumType(VehicleHistoryEntryType, {
  name: 'VehicleHistoryEntryType',
  description:
    'Distingue de qué fuente sale cada fila del historial integral del vehículo (spec 018).',
});

/**
 * Fila unificada del historial integral de un vehículo (spec 018): mezcla
 * siete fuentes (cambios de unidad, cambios de conductor a cargo, recorridos,
 * cargas de combustible, órdenes de mantenimiento, incidentes y salidas de
 * almacén con este vehículo como destino) en una sola línea de tiempo. Mismo
 * patrón que `LogbookEntry` (reporte de Combustible): campos anchos y
 * nulables, uno o varios por tipo; `driver` es el único campo compartido por
 * varios tipos porque ya tiene sus propios resolvers en `Personnel`.
 */
@ObjectType()
export class VehicleHistoryEntry {
  @Field(() => String)
  id!: string;

  @Field(() => VehicleHistoryEntryType)
  type!: VehicleHistoryEntryType;

  /// `startDate` en asignaciones, `departureAt` en recorridos, `suppliedAt`
  /// en cargas, `createdAt` en mantenimientos y salidas de almacén,
  /// `occurredAt` en incidentes.
  @Field(() => Date)
  occurredAt!: Date;

  /// Conductor relacionado: encargado (DRIVER_ASSIGNMENT), del recorrido, de
  /// la carga o del incidente. Nulo en los demás tipos.
  @Field(() => Personnel, { nullable: true })
  driver!: Personnel | null;

  /// Sólo UNIT_ASSIGNMENT.
  @Field(() => String, { nullable: true })
  unitName!: string | null;

  /// Sólo TRIP.
  @Field(() => String, { nullable: true })
  destination!: string | null;

  @Field(() => Date, { nullable: true })
  returnAt!: Date | null;

  @Field(() => Int, { nullable: true })
  distanceKm!: number | null;

  /// Sólo FUEL.
  @Field(() => FuelType, { nullable: true })
  fuelType!: FuelType | null;

  @Field(() => String, { nullable: true })
  station!: string | null;

  /// FUEL (litros) o STOCK_MOVEMENT (cantidad del artículo).
  @Field(() => Float, { nullable: true })
  quantity!: number | null;

  /// FUEL (costo total), MAINTENANCE (costo total) o INCIDENT (costo
  /// estimado): nunca se necesita más de uno a la vez en la misma fila.
  @Field(() => Float, { nullable: true })
  amount!: number | null;

  /// Sólo MAINTENANCE.
  @Field(() => MaintenanceType, { nullable: true })
  maintenanceType!: MaintenanceType | null;

  @Field(() => MaintenanceStatus, { nullable: true })
  maintenanceStatus!: MaintenanceStatus | null;

  @Field(() => String, { nullable: true })
  workshopName!: string | null;

  /// Sólo INCIDENT.
  @Field(() => IncidentType, { nullable: true })
  incidentType!: IncidentType | null;

  @Field(() => IncidentSeverity, { nullable: true })
  incidentSeverity!: IncidentSeverity | null;

  @Field(() => String, { nullable: true })
  place!: string | null;

  /// Sólo STOCK_MOVEMENT.
  @Field(() => StockMovementType, { nullable: true })
  stockMovementType!: StockMovementType | null;

  @Field(() => String, { nullable: true })
  sparePartName!: string | null;

  /// MAINTENANCE.description, INCIDENT.description o el motivo/nota más
  /// relevante del tipo de fila; nulo cuando el tipo no tiene texto propio.
  @Field(() => String, { nullable: true })
  description!: string | null;
}
