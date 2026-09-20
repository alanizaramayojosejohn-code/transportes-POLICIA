import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, Max, Min } from 'class-validator';

@ArgsType()
export class OdometerReadingFilterArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vehicleId?: string;

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
