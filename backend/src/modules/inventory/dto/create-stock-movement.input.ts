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
  type!: 'IN' | 'OUT' | 'ADJUSTMENT';

  /**
   * Para IN/OUT es siempre una magnitud positiva; para ADJUSTMENT es un
   * delta con signo que el servicio suma directo al saldo (sube o baja
   * según el conteo real). El rango válido depende de `type`, así que se
   * valida en `InventoryService.registerMovement`, no aquí.
   */
  @Field(() => Float)
  @IsNumber()
  quantity!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  /** Obligatorio cuando `type` es ADJUSTMENT (un ajuste sin motivo no deja
   * rastro de por qué cambió el saldo); opcional en IN/OUT. Depende de
   * `type`, así que esa obligatoriedad se valida en
   * `InventoryService.registerMovement`, no aquí (ver comentario en
   * `quantity` arriba: mismo motivo). */
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
