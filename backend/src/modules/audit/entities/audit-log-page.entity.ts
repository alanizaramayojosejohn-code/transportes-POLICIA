import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AuditLog } from './audit-log.entity.js';

@ObjectType()
export class AuditLogPage {
  @Field(() => [AuditLog])
  items!: AuditLog[];

  @Field(() => Int)
  total!: number;
}
