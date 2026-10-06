import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ProcedureAction } from '../../../generated/prisma/enums.js';

registerEnumType(ProcedureAction, {
  name: 'ProcedureAction',
  description:
    'Acción del sistema a la que se asocia un tipo de trámite (spec 016).',
});

/** Catálogo configurable de tipos de trámite (spec 016, RF-1 a RF-8). */
@ObjectType()
export class ProcedureType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ProcedureAction)
  action!: ProcedureAction;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
