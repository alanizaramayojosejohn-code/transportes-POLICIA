import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

/** RF-1/RF-2/RF-5: usuario, contraseña, nombre completo y rol son obligatorios. */
@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsString()
  @Length(1, 80)
  username!: string;

  @Field(() => String)
  @IsString()
  @Length(8, 100)
  password!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 150)
  fullName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  rank?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String)
  @IsString()
  roleId!: string;
}
