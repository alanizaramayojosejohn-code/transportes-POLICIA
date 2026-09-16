import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { IncidentType } from '../../../generated/prisma/enums.js';

/** RF-5: filtro por vehículo, tipo y texto libre. */
@ArgsType()
export class IncidentFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => IncidentType, { nullable: true })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

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
