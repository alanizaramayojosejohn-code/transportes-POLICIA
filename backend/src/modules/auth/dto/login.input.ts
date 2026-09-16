import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

/** RF-1/RF-2: sólo exige presencia; la política de fuerza de la contraseña
 * ya se aplicó al crearla (spec 004, RF-5), no se repite aquí. */
@InputType()
export class LoginInput {
  @Field(() => String)
  @IsString()
  @Length(1, 80)
  username!: string;

  @Field(() => String)
  @IsString()
  @Length(1, 100)
  password!: string;
}
