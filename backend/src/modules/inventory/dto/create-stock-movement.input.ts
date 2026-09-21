import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { StockMovementType } from '../../../generated/prisma/enums.js';

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
}
