import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  MaintenanceStatus,
  MaintenanceType,
} from '../../../generated/prisma/enums.js';

registerEnumType(MaintenanceType, {
  name: 'MaintenanceType',
  description: 'Tipo de mantenimiento: preventivo o correctivo.',
});
registerEnumType(MaintenanceStatus, {
  name: 'MaintenanceStatus',
  description: 'Estado de una orden de mantenimiento.',
});

/**
 * Tipo GraphQL de salida para MaintenanceOrder (spec 008). `laborCost` y
 * `totalCost` viajan como `Float` (misma decisión que FuelRecord, spec 007:
 * no hay escalar `Decimal` instalado en el proyecto).
 */
@ObjectType()
export class MaintenanceOrder {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => MaintenanceType)
  type!: MaintenanceType;

  @Field(() => MaintenanceStatus)
  status!: MaintenanceStatus;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  workshopName!: string | null;

  @Field(() => Int)
  odometer!: number;

  @Field(() => Date, { nullable: true })
  startedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  finishedAt!: Date | null;

  @Field(() => Float)
  totalCost!: number;

  @Field(() => String, { nullable: true })
  invoiceNumber!: string | null;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => Date)
  createdAt!: Date;
}
