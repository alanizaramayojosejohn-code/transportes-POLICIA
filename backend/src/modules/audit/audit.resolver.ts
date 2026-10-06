import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditLogPage } from './entities/audit-log-page.entity.js';
import { AuditSummary } from './entities/audit-summary.entity.js';
import { AuditLogFilterArgs } from './dto/audit-log-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Sólo consulta (spec 019, RF-12): no declara ninguna mutation, así que las
 * filas de la bitácora no se pueden crear, editar ni borrar desde la API.
 *
 * Exclusivo de ADMINISTRADOR y acotado en el backend, no sólo en el menú: la
 * auditoría revela la actividad de terceros (spec 019, RF-15).
 */
@Resolver(() => AuditLog)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Query(() => AuditLogPage, { name: 'auditLogs' })
  findAll(@Args() filters: AuditLogFilterArgs) {
    return this.auditService.findAll(filters);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Query(() => AuditSummary, { name: 'auditSummary' })
  summary() {
    return this.auditService.summary();
  }
}
