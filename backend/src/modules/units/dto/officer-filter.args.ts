import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Max, Min } from 'class-validator';

/** RF-17: búsqueda por cédula, nombres, apellidos o grado. */
@ArgsType()
export class OfficerFilterArgs {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
