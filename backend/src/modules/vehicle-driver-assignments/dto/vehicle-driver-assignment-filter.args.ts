import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Max, Min } from 'class-validator';

/** Filtro por vehículo, conductor y estado (vigente/histórico). */
@ArgsType()
export class VehicleDriverAssignmentFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string;

  /// true = sólo vigentes, false = sólo históricas, ausente = todas.
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  current?: boolean;

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
