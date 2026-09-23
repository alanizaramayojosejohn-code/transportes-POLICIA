import { ArgsType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ProcedureAction } from '../../../generated/prisma/enums.js';

/** RF-18: filtro por acción, estado y texto libre (nombre). */
@ArgsType()
export class ProcedureTypeFilterArgs {
  @Field(() => ProcedureAction, { nullable: true })
  @IsOptional()
  @IsEnum(ProcedureAction)
  action?: ProcedureAction;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @Min(0)
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  take?: number;
}
