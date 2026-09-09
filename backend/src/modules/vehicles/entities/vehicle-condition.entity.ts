import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { VehicleConditionCode } from '../../../generated/prisma/enums.js';

registerEnumType(VehicleConditionCode, {
  name: 'VehicleConditionCode',
  description:
    'Condición física del vehículo. No incluye "En mantenimiento" ni ' +
    '"Separado por incidente": esos valores sólo los registran los módulos ' +
    'de Mantenimiento e Incidentes (spec 001, RF-06).',
});

/**
 * Una entrada del historial de condición (spec 001, RF-05). Append-only:
 * ninguna operación la edita ni la borra.
 */
@ObjectType()
export class VehicleCondition {
  @Field(() => String)
  id!: string;

  @Field(() => VehicleConditionCode)
  code!: VehicleConditionCode;

  @Field(() => String, { nullable: true })
  reason!: string | null;

  @Field(() => String, { nullable: true })
  registeredByRole!: string | null;

  @Field(() => Date)
  changedAt!: Date;

  @Field(() => String)
  vehicleId!: string;
}
