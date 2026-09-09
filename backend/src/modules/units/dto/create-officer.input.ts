import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** RF-13: cédula, nombres y apellidos son obligatorios. */
@InputType()
export class CreateOfficerInput {
  @Field(() => String)
  @IsString()
  @Length(1, 20)
  ci!: string;

  /// `@MaxLength`, no `@Length(1, ...)`: un complemento vacío explícito
  /// ("") es una entrada válida, equivalente a no informarlo (caso límite
  /// del spec 002 sobre unicidad de cédula).
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  ciComplement?: string;

  @Field(() => String)
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 120)
  lastName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  rank?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currentUnitId?: string;
}
