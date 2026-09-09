import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/** RF-18: unidad, persona y fecha de inicio son obligatorios. */
@InputType()
export class AssignTransportManagerInput {
  @Field(() => String)
  @IsString()
  unitId!: string;

  @Field(() => String)
  @IsString()
  officerId!: string;

  /// Fecha (sin hora): `Field(() => String)` a propósito. `Field(() => Date)`
  /// haría que GraphQL entregue un objeto Date ya parseado, incompatible con
  /// `@IsDateString()` (que valida el string ISO tal como llega del cliente).
  @Field(() => String)
  @IsDateString()
  startDate!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  referenceDocument?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
