import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { VehicleType } from '../../../generated/prisma/enums.js';

registerEnumType(VehicleType, {
  name: 'VehicleType',
  description: 'Categoría del vehículo dentro del parque automotor.',
});

/**
 * Tipo GraphQL de salida para Vehicle (spec 001). Es un objeto de
 * presentación, no el modelo de Prisma: la condición vigente e histórica
 * viajan como campos resueltos (VehiclesResolver), nunca como columna propia,
 * porque el spec exige que se deriven siempre del historial.
 */
@ObjectType()
export class Vehicle {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  plate!: string;

  @Field(() => String, { nullable: true })
  plateDnfr!: string | null;

  @Field(() => VehicleType)
  type!: VehicleType;

  @Field(() => String, { nullable: true })
  brand!: string | null;

  @Field(() => String, { nullable: true })
  model!: string | null;

  @Field(() => Int, { nullable: true })
  year!: number | null;

  @Field(() => String, { nullable: true })
  color!: string | null;

  @Field(() => String, { nullable: true })
  chassisNumber!: string | null;

  @Field(() => String, { nullable: true })
  engineNumber!: string | null;

  @Field(() => String, { nullable: true })
  origin!: string | null;

  @Field(() => String, { nullable: true })
  receptionSource!: string | null;

  @Field(() => String, { nullable: true })
  observations!: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String, { nullable: true })
  departmentId!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
