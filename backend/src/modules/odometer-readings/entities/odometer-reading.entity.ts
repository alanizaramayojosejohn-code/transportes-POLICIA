import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OdometerSource } from '../../../generated/prisma/enums.js';

registerEnumType(OdometerSource, {
  name: 'OdometerSource',
  description: 'Origen de una lectura de kilometraje.',
});

/**
 * Lectura de kilometraje (spec 014, RF-16/RF-17). El modelo `OdometerReading`
 * existe desde la migración inicial; este módulo es el primero que lo
 * expone, con origen `MANUAL` para el kilometraje suelto que registra
 * ADMINISTRADOR, TRANSPORTES o CONDUCTOR.
 */
@ObjectType()
export class OdometerReading {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  value!: number;

  @Field(() => Date)
  readingAt!: Date;

  @Field(() => OdometerSource)
  source!: OdometerSource;

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => String)
  registeredById!: string;
}
