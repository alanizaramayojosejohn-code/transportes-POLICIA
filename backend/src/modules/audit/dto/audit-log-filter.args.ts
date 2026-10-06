import { ArgsType, Field, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AuditAction } from '../../../generated/prisma/enums.js';

/** Los cuatro filtros de la maqueta (spec 019, RF-14), combinables entre sí. */
@ArgsType()
export class AuditLogFilterArgs {
  /// Usuario, entidad o etiqueta del registro afectado.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  /// Módulo de la interfaz (`VEHICULOS`, `INVENTARIO`...). Se traduce a las
  /// entidades que lo componen, porque el módulo no es una columna.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  module?: string;

  @Field(() => AuditAction, { nullable: true })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  /// Un día concreto (`YYYY-MM-DD`), no un rango: es lo que ofrece la maqueta.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsISO8601()
  date?: string;

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
