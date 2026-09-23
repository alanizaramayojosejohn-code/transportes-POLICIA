import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '../../../generated/prisma/enums.js';
import { ProcedureChecklistItemInput } from '../../procedures/dto/procedure-checklist-item.input.js';

/** RF-6/RF-7: artículo, tipo y cantidad son obligatorios. */
@InputType()
export class CreateStockMovementInput {
  @Field(() => String)
  @IsString()
  sparePartId!: string;

  @Field(() => StockMovementType)
  @IsEnum(StockMovementType)
  type!: 'IN' | 'OUT';

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  supplier?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reference?: string;

  /** Spec 017 RF-4/RF-5: sólo aplica a una entrada; en una salida se ignora. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  /// `Field(() => String)` a propósito, igual que otras fechas de entrada en
  /// el proyecto, para poder usar `@IsDateString()`.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  lotExpiresAt?: string;

  /** Spec 017 RF-6/RF-8: sólo aplica a una salida; en una entrada se ignora. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  /**
   * Spec 016 RF-11/RF-12: orden de mantenimiento relacionada de una salida,
   * para que el checklist de trámites de Entrega de refacciones se vincule
   * a ambos. Igual que `vehicleId`, sólo aplica a una salida; se ignora en
   * una entrada.
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  maintenanceOrderId?: string;

  /** Spec 016 RF-9/RF-10: checklist de trámites mostrado al registrar. */
  @Field(() => [ProcedureChecklistItemInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureChecklistItemInput)
  checklistItems?: ProcedureChecklistItemInput[];
}
