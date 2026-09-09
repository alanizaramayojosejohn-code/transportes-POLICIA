import { InputType, PartialType } from '@nestjs/graphql';
import { CreateVehicleInput } from './create-vehicle.input.js';

/**
 * RF-04: todos los campos propios del vehículo son editables (incluida placa
 * y chasis, según el propio RF-04). La condición y la unidad actual no viven
 * aquí: se editan por sus propias mutaciones (registerVehicleCondition,
 * unit-assignments), nunca junto con los datos descriptivos.
 */
@InputType()
export class UpdateVehicleInput extends PartialType(CreateVehicleInput) {}
