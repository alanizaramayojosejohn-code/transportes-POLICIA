import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '../../../generated/prisma/enums.js';

/** RF-1: vehículo, tipo y fecha de vencimiento son obligatorios. */
@InputType()
export class CreateVehicleDocumentInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => DocumentType)
  @IsEnum(DocumentType)
  type!: DocumentType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  /// `Field(() => String)` a propósito: igual que otras fechas de entrada en
  /// el proyecto, para poder usar `@IsDateString()`.
  @Field(() => String)
  @IsDateString()
  expiresAt!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
