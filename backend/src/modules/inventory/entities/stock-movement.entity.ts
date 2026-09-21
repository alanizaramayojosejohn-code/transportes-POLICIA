import { Field, Float, ObjectType, registerEnumType } from '@nestjs/graphql';
import { StockMovementType } from '../../../generated/prisma/enums.js';

registerEnumType(StockMovementType, {
  name: 'StockMovementType',
  description: 'Tipo de movimiento de inventario.',
});

@ObjectType()
export class StockMovement {
  @Field(() => String)
  id!: string;

  @Field(() => StockMovementType)
  type!: StockMovementType;

  @Field(() => Float)
  quantity!: number;

  @Field(() => Float, { nullable: true })
  unitCost!: number | null;

  @Field(() => Float)
  balanceAfter!: number;

  @Field(() => String, { nullable: true })
  reason!: string | null;

  @Field(() => String, { nullable: true })
  supplier!: string | null;

  @Field(() => String, { nullable: true })
  reference!: string | null;

  @Field(() => String, { nullable: true })
  lotNumber!: string | null;

  @Field(() => Date, { nullable: true })
  lotExpiresAt!: Date | null;

  @Field(() => String)
  sparePartId!: string;

  @Field(() => String, { nullable: true })
  vehicleId!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
