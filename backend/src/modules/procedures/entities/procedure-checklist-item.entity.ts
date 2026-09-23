import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Ítem de checklist guardado junto con el registro de una acción (spec 016,
 * RF-7 a RF-16). Exactamente uno de los cuatro vínculos aplica según la
 * acción de su tipo de trámite, salvo Entrega de refacciones con orden de
 * mantenimiento relacionada (RF-11), donde `stockMovementId` y
 * `maintenanceOrderId` van juntos en el mismo ítem.
 */
@ObjectType()
export class ProcedureChecklistItem {
  @Field(() => String)
  id!: string;

  @Field(() => Boolean)
  completed!: boolean;

  @Field(() => String, { nullable: true })
  documentCode!: string | null;

  @Field(() => String)
  procedureTypeId!: string;

  @Field(() => String, { nullable: true })
  vehicleId!: string | null;

  @Field(() => String, { nullable: true })
  fuelRecordId!: string | null;

  @Field(() => String, { nullable: true })
  stockMovementId!: string | null;

  @Field(() => String, { nullable: true })
  maintenanceOrderId!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
