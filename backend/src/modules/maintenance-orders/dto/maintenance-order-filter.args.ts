import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  MaintenanceStatus,
  MaintenanceType,
} from '../../../generated/prisma/enums.js';

/** RF-6: filtro por vehículo, tipo, estado y texto libre. */
@ArgsType()
export class MaintenanceOrderFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @Field(() => MaintenanceType, { nullable: true })
  @IsOptional()
  @IsEnum(MaintenanceType)
  type?: MaintenanceType;

  @Field(() => MaintenanceStatus, { nullable: true })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

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
