import { InputType, PartialType } from '@nestjs/graphql';
import { CreateDriverInput } from './create-driver.input.js';

/** RF-5: todos los campos son editables. */
@InputType()
export class UpdateDriverInput extends PartialType(CreateDriverInput) {}
