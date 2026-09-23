import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * RF-7/RF-8: un ítem por cada tipo de trámite que el formulario mostró al
 * registrar la acción, marcado o no. Se embebe en el input de alta de
 * vehículo, vale de combustible, entrega de refacciones y orden de
 * mantenimiento.
 */
@InputType()
export class ProcedureChecklistItemInput {
  @Field(() => String)
  @IsString()
  procedureTypeId!: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  documentCode?: string;
}
