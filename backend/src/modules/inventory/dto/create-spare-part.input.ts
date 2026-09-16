import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

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
