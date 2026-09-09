import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Reemplaza temporalmente a un guard de autenticación real: no hay login ni
 * JWT todavía, así que el rol viaja en el header `x-user-role` (lo agrega el
 * interceptor del cliente Angular). Se reemplaza por un guard basado en el
 * usuario autenticado cuando exista un spec de autenticación.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[] | undefined>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = GqlExecutionContext.create(context).getContext<{
      req?: { headers: Record<string, string | string[] | undefined> };
    }>().req;
    const role = req?.headers['x-user-role'];
    const currentRole = Array.isArray(role) ? role[0] : role;

    if (!currentRole || !requiredRoles.includes(currentRole)) {
      throw new ForbiddenException(
        'No tiene permiso para realizar esta operación',
      );
    }

    return true;
  }
}
