import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceType } from '../../../generated/prisma/enums.js';
import { ProcedureChecklistItemInput } from '../../procedures/dto/procedure-checklist-item.input.js';

/** RF-1: vehículo, tipo, kilometraje y descripción son obligatorios. */
@InputType()
export class CreateMaintenanceOrderInput {
  @Field(() => String)
  @IsString()
  vehicleId!: string;

  @Field(() => MaintenanceType)
  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  workshopName?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  odometer!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @Field(() => String)
  @IsString()
  @Length(1, 2000)
  description!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  /** Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar. */
  @Field(() => [ProcedureChecklistItemInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureChecklistItemInput)
  checklistItems?: ProcedureChecklistItemInput[];
}
