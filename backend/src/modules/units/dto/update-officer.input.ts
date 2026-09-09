import { InputType, PartialType } from '@nestjs/graphql';
import { CreateOfficerInput } from './create-officer.input.js';

/** RF-15: no afecta ninguna designación de encargado ya registrada. */
@InputType()
export class UpdateOfficerInput extends PartialType(CreateOfficerInput) {}
