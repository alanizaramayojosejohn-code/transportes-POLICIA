import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Vehicle } from './vehicle.entity.js';

/**
 * Página de resultados con el total sin paginar, para que la tabla del
 * cliente pueda calcular cuántas páginas hay sin pedirlas todas.
 */
@ObjectType()
export class VehiclePage {
  @Field(() => [Vehicle])
  items!: Vehicle[];

  @Field(() => Int)
  total!: number;
}
