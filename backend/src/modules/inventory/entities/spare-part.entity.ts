import { Field, Float, ObjectType, registerEnumType } from '@nestjs/graphql';
import { SparePartType } from '../../../generated/prisma/enums.js';

registerEnumType(SparePartType, {
  name: 'SparePartType',
  description:
    'Tipo de artículo: determina qué campos aplica el formulario (spec 017).',
});

/**
 * Tipo GraphQL de salida para SparePart (spec 009, extendido por el 017).
 * `currentStock`, etc. viajan como `Float` (misma decisión que los specs
 * 007/008: no hay escalar `Decimal` instalado). `category` viaja como campo
 * resuelto.
 */
@ObjectType()
export class SparePart {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => SparePartType)
  type!: SparePartType;

  @Field(() => String, { nullable: true })
  tireSize!: string | null;

  @Field(() => Float, { nullable: true })
  weight!: number | null;

  @Field(() => String)
  unit!: string;

  @Field(() => Float)
  minStock!: number;

  @Field(() => Float)
  currentStock!: number;

  @Field(() => Float, { nullable: true })
  lastUnitCost!: number | null;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String, { nullable: true })
  categoryId!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
