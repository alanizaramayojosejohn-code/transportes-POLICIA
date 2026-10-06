import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ProcedureAction } from '../../../generated/prisma/enums.js';

/** RF-1/RF-2: nombre y acción son obligatorios; descripción es opcional. */
@InputType()
export class CreateProcedureTypeInput {
  @Field(() => String)
  @IsString()
  @Length(1, 120)
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => ProcedureAction)
  @IsEnum(ProcedureAction)
  action!: ProcedureAction;
}
