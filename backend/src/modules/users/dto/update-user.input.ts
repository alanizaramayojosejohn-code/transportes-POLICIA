import { InputType, PartialType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input.js';

/**
 * RF-7/RF-8: todos los campos son editables; la contraseña sólo se
 * reemplaza cuando se envía, nunca se borra por omitirla.
 */
@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {}
