import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditAction } from '../../generated/prisma/enums.js';
import { AuditLogFilterArgs } from './dto/audit-log-filter.args.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { describe, entitiesForModule, moduleForEntity } from './audit-map.js';

/** Fila a registrar, tal como la arma `AuditInterceptor`. */
export interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  after: unknown;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const AUDIT_LOG_INCLUDE = {
  user: { select: { id: true, username: true, fullName: true } },
} satisfies Prisma.AuditLogInclude;

type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: typeof AUDIT_LOG_INCLUDE;
}>;

/**
 * Bitácora de auditoría (spec 019). Sólo dos responsabilidades: registrar un
 * evento (la escribe el interceptor, nunca un resolver) y consultarla.
 *
 * No expone forma de editar ni borrar eventos: el módulo no declara mutations
 * (spec 019, RF-12).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un evento (spec 019, RF-1). **Nunca lanza**: cuando el
   * interceptor llega acá la operación de negocio ya se confirmó, así que
   * propagar un error le diría al usuario que su operación falló cuando sí se
   * hizo (spec 019, RF-11). Un fallo queda en el log del servidor.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          entityLabel: entry.entityLabel,
          after:
            entry.after === undefined
              ? undefined
              : (entry.after as Prisma.InputJsonValue),
          userId: entry.userId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar el evento de auditoría (${entry.action} ${entry.entity})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** RF-13/RF-14: paginado, filtrable y ordenado por fecha descendente. */
  async findAll(filters: AuditLogFilterArgs) {
    const where = this.buildWhere(filters);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: AUDIT_LOG_INCLUDE,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items: items.map((item) => this.toEntity(item)), total };
  }

  /** RF-16: los cuatro indicadores de la maqueta. */
  async summary(): Promise<{
    total: number;
    today: number;
    created: number;
    updated: number;
  }> {
    const [total, today, created, updated] = await this.prisma.$transaction([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startOfToday() } },
      }),
      this.prisma.auditLog.count({ where: { action: AuditAction.CREATE } }),
      this.prisma.auditLog.count({ where: { action: AuditAction.UPDATE } }),
    ]);

    return { total, today, created, updated };
  }

  private buildWhere(filters: AuditLogFilterArgs): Prisma.AuditLogWhereInput {
    return {
      ...(filters.action ? { action: filters.action } : {}),
      /// El módulo no es columna: se traduce a las entidades que lo componen.
      ...(filters.module
        ? { entity: { in: entitiesForModule(filters.module) } }
        : {}),
      ...(filters.date ? { createdAt: dayRange(filters.date) } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                entityLabel: { contains: filters.search, mode: 'insensitive' },
              },
              { entity: { contains: filters.search, mode: 'insensitive' } },
              {
                user: {
                  username: { contains: filters.search, mode: 'insensitive' },
                },
              },
              {
                user: {
                  fullName: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  /// `module` y `description` se calculan acá (spec 019, RF-6/RF-21): son
  /// proyecciones de la fila, no columnas. `after` viaja como JSON serializado.
  private toEntity(row: AuditLogWithUser): AuditLog {
    return {
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      entityLabel: row.entityLabel,
      module: moduleForEntity(row.entity),
      description: describe(row.action, row.entity, row.entityLabel),
      after: row.after === null ? null : JSON.stringify(row.after, null, 2),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      user: row.user,
      createdAt: row.createdAt,
    };
  }
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/// Un día completo en hora local, no el instante UTC de medianoche: el filtro
/// de la maqueta es «los eventos de este día» según el reloj del usuario.
function dayRange(date: string): { gte: Date; lt: Date } {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  return { gte: start, lt: end };
}
