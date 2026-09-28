import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AuditAction } from '../../../generated/prisma/enums.js';

registerEnumType(AuditAction, {
  name: 'AuditAction',
  description: 'Tipo de operación registrada en la bitácora de auditoría.',
});

/**
 * Usuario que originó el evento. Sólo lo mínimo para mostrarlo en la tabla: la
 * cuenta puede haber sido eliminada (`onDelete: SetNull`), en cuyo caso el
 * evento llega con `user` nulo y la interfaz lo rotula «usuario eliminado»
 * (spec 019, RF-17).
 */
@ObjectType()
export class AuditLogUser {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  username!: string;

  @Field(() => String)
  fullName!: string;
}

/** Tipo GraphQL de salida para AuditLog (spec 019). */
@ObjectType()
export class AuditLog {
  @Field(() => String)
  id!: string;

  @Field(() => AuditAction)
  action!: AuditAction;

  @Field(() => String)
  entity!: string;

  @Field(() => String, { nullable: true })
  entityId!: string | null;

  @Field(() => String, { nullable: true })
  entityLabel!: string | null;

  /// Proyección de `entity`, no una columna (spec 019, RF-6).
  @Field(() => String)
  module!: string;

  /// Compuesta al leer desde acción + entidad + etiqueta (spec 019, RF-21).
  @Field(() => String)
  description!: string;

  /**
   * Payload de la operación, ya saneado al escribirse (spec 019, RF-8), como
   * JSON serializado. Se expone como texto y no como escalar JSON a propósito:
   * el proyecto no tiene un escalar JSON ni codegen de cliente, y la maqueta
   * muestra este campo como el bloque de texto «Detalle del evento», no como
   * una estructura navegable.
   */
  @Field(() => String, { nullable: true })
  after!: string | null;

  @Field(() => String, { nullable: true })
  ipAddress!: string | null;

  @Field(() => String, { nullable: true })
  userAgent!: string | null;

  @Field(() => AuditLogUser, { nullable: true })
  user!: AuditLogUser | null;

  @Field(() => Date)
  createdAt!: Date;
}
