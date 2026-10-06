import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { GraphQLResolveInfo } from 'graphql';
import { concatMap, Observable } from 'rxjs';
import { AuditService } from './audit.service.js';
import {
  actionForMutation,
  entityForMutation,
  entityIdFrom,
  labelFor,
  sanitize,
} from './audit-map.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/** Forma mínima de la petición HTTP que necesita la auditoría. */
interface AuditRequest {
  user?: AuthenticatedUser;
  ip?: string;
  headers?: Record<string, unknown>;
}

/**
 * Registra en la bitácora toda mutation que termine con éxito (spec 019, RF-1).
 *
 * Es un interceptor global en vez de una llamada por servicio a propósito: el
 * sistema tiene 47 mutations de forma muy uniforme, y derivarlo todo acá cubre
 * las 47 sin que ninguna pueda quedar sin rastro por olvido — incluida la que
 * se agregue mañana, siempre que se la declare en `audit-map.ts` (cosa que
 * `audit.interceptor.spec` verifica contra el esquema).
 *
 * El precio de correr después de la escritura es que no hay estado previo:
 * `before` queda nulo (spec 019, «Fuera de alcance»).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    /// Un interceptor global envuelve todos los resolvers, incluidos los
    /// `@ResolveField`. `parentType` es la forma fiable de quedarse sólo con
    /// las mutations de primer nivel: en un campo resuelto es la entidad
    /// (`Vehicle`), y en una consulta es `Query`.
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo<GraphQLResolveInfo | undefined>();
    if (info?.parentType?.name !== 'Mutation') {
      return next.handle();
    }

    const mutationName = info.fieldName;
    const action = actionForMutation(mutationName);
    const entity = entityForMutation(mutationName);
    /// Mutation no declarada: no se audita. Es deliberado que no lance — una
    /// mutation nueva sin declarar no debe tumbar la operación, y el test del
    /// esquema es quien avisa del olvido.
    if (!action || !entity) {
      return next.handle();
    }

    const args = gqlContext.getArgs<Record<string, unknown>>();
    const request = gqlContext.getContext<{ req?: AuditRequest }>().req;

    /// Se espera la inserción antes de responder: `record` nunca lanza, y así
    /// el evento no se pierde si el proceso termina justo después (spec 019,
    /// RF-11).
    return next.handle().pipe(
      concatMap(async (result: unknown) => {
        await this.auditService.record({
          action,
          entity,
          entityId: entityIdFrom(result, args),
          entityLabel: this.resolveLabel(entity, result, args),
          after: sanitize({ ...args, resultado: sanitize(result) }),
          userId: this.resolveUserId(entity, result, request),
          ipAddress: request?.ip ?? null,
          userAgent: readHeader(request, 'user-agent'),
        });
        return result;
      }),
    );
  }

  /**
   * Etiqueta del registro afectado (spec 019, RF-5): primero del resultado;
   * si no salió nada, de los argumentos. El respaldo en argumentos es lo que
   * permite que `removeVehiclePhoto` registre el slot que se borró, ya que su
   * resultado es un `Boolean` sin datos.
   *
   * `login` es el único caso anidado: el usuario viaja en `result.user`.
   */
  private resolveLabel(
    entity: string,
    result: unknown,
    args: Record<string, unknown>,
  ): string | null {
    const source = entity === 'Session' ? readUser(result) : result;
    return labelFor(entity, source) ?? labelFor(entity, args);
  }

  /**
   * Usuario actor. Normalmente sale de `req.user` (puesto por `JwtStrategy`),
   * pero `login` es `@Public()` y todavía no lo tiene: ahí sale del resultado
   * (spec 019, RF-9).
   */
  private resolveUserId(
    entity: string,
    result: unknown,
    request: AuditRequest | undefined,
  ): string | null {
    if (entity === 'Session') {
      const user = readUser(result);
      return user && typeof user.id === 'string' ? user.id : null;
    }
    return request?.user?.id ?? null;
  }
}

function readUser(result: unknown): Record<string, unknown> | null {
  if (typeof result !== 'object' || result === null) return null;
  const user = (result as Record<string, unknown>).user;
  return typeof user === 'object' && user !== null
    ? (user as Record<string, unknown>)
    : null;
}

function readHeader(
  request: AuditRequest | undefined,
  name: string,
): string | null {
  const value = request?.headers?.[name];
  return typeof value === 'string' ? value : null;
}
