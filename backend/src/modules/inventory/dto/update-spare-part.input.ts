import { InputType, PartialType } from '@nestjs/graphql';
import { CreateSparePartInput } from './create-spare-part.input.js';

/** RF-4: todos los campos son editables, salvo el stock. */
@InputType()
export class UpdateSparePartInput extends PartialType(CreateSparePartInput) {}
