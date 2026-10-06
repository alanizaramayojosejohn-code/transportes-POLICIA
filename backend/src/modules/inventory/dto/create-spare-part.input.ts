import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { SparePartType } from '../../../generated/prisma/enums.js';

/** RF-1: código, nombre, categoría y unidad de medida son obligatorios. */
@InputType()
export class CreateSparePartInput {
  @Field(() => String)
  @IsString()
  @Length(1, 40)
  code!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 150)
  name!: string;

  @Field(() => String)
  @IsString()
  categoryId!: string;

  /** Spec 017 RF-1: por defecto OTRO cuando no se indica. */
  @Field(() => SparePartType, { nullable: true })
  @IsOptional()
  @IsEnum(SparePartType)
  type?: SparePartType;

  /** Spec 017 RF-2: sólo tiene sentido cuando `type` es LLANTA. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  tireSize?: string;

  /** Spec 017 RF-3: peso unitario en kilogramos, para cualquier tipo. */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @Field(() => String)
  @IsString()
  @Length(1, 30)
  unit!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
