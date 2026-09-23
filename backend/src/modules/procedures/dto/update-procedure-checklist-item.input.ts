import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** RF-15/RF-16: edición posterior de un ítem ya existente; no crea ítems. */
@InputType()
export class UpdateProcedureChecklistItemInput {
  @Field(() => String)
  @IsString()
  id!: string;

  @Field(() => Boolean)
  @IsBoolean()
  completed!: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  documentCode?: string;
}
