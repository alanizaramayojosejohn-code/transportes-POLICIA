import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Max, Min } from 'class-validator';

/** RF-8: filtro por vehículo, estado (abierto/cerrado) y texto libre. */
@ArgsType()
export class TripFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string;

  /// true = sólo abiertos, false = sólo cerrados, ausente = todos.
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  open?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

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
