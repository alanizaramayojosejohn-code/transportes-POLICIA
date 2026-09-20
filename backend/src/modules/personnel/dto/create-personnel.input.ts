import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * CI, nombres y apellidos son siempre obligatorios (fusión de RF-13 spec 002
 * y RF-1 spec 005). Licencia sólo se exige cuando `isDriver` es verdadero;
 * esa validación cruzada vive en `PersonnelService.create`, no aquí, porque
 * depende del valor de otro campo.
 */
@InputType()
export class CreatePersonnelInput {
  @Field(() => String)
  @IsString()
  @Length(1, 20)
  ci!: string;

  /// `@MaxLength`, no `@Length(1, ...)`: un complemento vacío explícito
  /// ("") es una entrada válida, equivalente a no informarlo.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  ciComplement?: string;

  @Field(() => String)
  @IsString()
  @Length(1, 150)
  firstName!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 150)
  lastName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  rank?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isDriver?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isOfficer?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  licenseNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  licenseCategory?: string;

  /// `Field(() => String)` a propósito: GraphQL `Date` entregaría un objeto
  /// Date ya parseado, incompatible con `@IsDateString()`.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  licenseExpiresAt?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  observations?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitId?: string;
}
