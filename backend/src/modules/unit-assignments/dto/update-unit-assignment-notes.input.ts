import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

/**
 * RF-10: sobre la asignación vigente de un vehículo sólo se puede corregir
 * motivo, documento de referencia y observaciones; nunca vehículo, unidad ni
 * fechas.
 */
@InputType()
export class UpdateUnitAssignmentNotesInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  referenceDocument?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
