import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  IncidentSeverity,
  IncidentType,
} from '../../../generated/prisma/enums.js';

registerEnumType(IncidentType, {
  name: 'IncidentType',
  description: 'Tipo de incidente vehicular.',
});
registerEnumType(IncidentSeverity, {
  name: 'IncidentSeverity',
  description: 'Gravedad de un incidente.',
});

/** Tipo GraphQL de salida para Incident (spec 011). */
@ObjectType()
export class Incident {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => IncidentType)
  type!: IncidentType;

  @Field(() => IncidentSeverity)
  severity!: IncidentSeverity;

  @Field(() => Date)
  occurredAt!: Date;

  @Field(() => String)
  place!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  damages!: string | null;

  @Field(() => String, { nullable: true })
  policeReportNumber!: string | null;

  @Field(() => String)
  vehicleId!: string;

  @Field(() => String, { nullable: true })
  driverId!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
