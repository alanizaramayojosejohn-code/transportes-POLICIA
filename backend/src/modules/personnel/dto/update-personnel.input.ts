import { InputType, PartialType } from '@nestjs/graphql';
import { CreatePersonnelInput } from './create-personnel.input.js';

/** Todos los campos son editables; no afecta ninguna designación de encargado ya registrada. */
@InputType()
export class UpdatePersonnelInput extends PartialType(CreatePersonnelInput) {}
