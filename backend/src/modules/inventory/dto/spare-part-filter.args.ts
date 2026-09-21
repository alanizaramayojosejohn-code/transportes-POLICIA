import { ArgsType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SparePartType } from '../../../generated/prisma/enums.js';

/** RF-10: filtro por categoría, estado y texto libre; RF-9 (spec 017): por tipo. */
@ArgsType()
export class SparePartFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field(() => SparePartType, { nullable: true })
  @IsOptional()
  @IsEnum(SparePartType)
  type?: SparePartType;

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
