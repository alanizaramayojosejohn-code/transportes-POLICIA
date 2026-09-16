import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** RF-4: costo total es obligatorio; fecha de finalización por defecto es la actual. */
@InputType()
export class FinishMaintenanceOrderInput {
  @Field(() => Float)
  @IsNumber()
  @Min(0)
  totalCost!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;
}
