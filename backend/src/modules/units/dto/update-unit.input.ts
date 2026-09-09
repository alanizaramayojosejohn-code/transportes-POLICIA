import { InputType, PartialType } from '@nestjs/graphql';
import { CreateUnitInput } from './create-unit.input.js';

/**
 * RF-04: todos los datos propios de la unidad son editables sin afectar su
 * historial de encargados. Dar de baja / reactivar son mutaciones propias.
 */
@InputType()
export class UpdateUnitInput extends PartialType(CreateUnitInput) {}
