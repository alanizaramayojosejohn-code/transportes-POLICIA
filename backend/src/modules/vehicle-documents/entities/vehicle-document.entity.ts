import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DocumentType } from '../../../generated/prisma/enums.js';

registerEnumType(DocumentType, {
  name: 'DocumentType',
  description: 'Tipo de documento vehicular.',
});

/** Tipo GraphQL de salida para VehicleDocument (spec 010). */
@ObjectType()
export class VehicleDocument {
  @Field(() => String)
  id!: string;

  @Field(() => DocumentType)
  type!: DocumentType;

  @Field(() => String, { nullable: true })
  documentNumber!: string | null;

  @Field(() => Date, { nullable: true })
  issuedAt!: Date | null;

  @Field(() => Date)
  expiresAt!: Date;

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => Date)
  createdAt!: Date;
}
