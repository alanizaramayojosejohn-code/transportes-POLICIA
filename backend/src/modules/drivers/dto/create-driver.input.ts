import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

/** RF-1: CI, nombres, apellidos, licencia, categoría y vencimiento son obligatorios. */
@InputType()
export class CreateDriverInput {
  @Field(() => String)
  @IsString()
  @Length(1, 150)
  firstName!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 150)
  lastName!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 20)
  ci!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  rank?: string;

  @Field(() => String)
  @IsString()
  @Length(1, 40)
  licenseNumber!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 10)
  licenseCategory!: string;

  /// `Field(() => String)` a propósito: GraphQL `Date` entregaría un objeto
  /// Date ya parseado, incompatible con `@IsDateString()`.
  @Field(() => String)
  @IsDateString()
  licenseExpiresAt!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitId?: string;
}
