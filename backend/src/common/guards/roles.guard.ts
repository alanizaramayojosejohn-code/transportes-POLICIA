import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../modules/auth/auth.types.js';

/**
 * Restringe una mutación a ciertos roles. El usuario ya está autenticado
 * cuando este guard corre (`JwtAuthGuard` es global y corre primero): el rol
 * sale de `req.user.role`, puesto por `JwtStrategy`, ya no del header
 * simulado `x-user-role` (spec 013).
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
      req?: { user?: AuthenticatedUser };
    }>().req;

    if (!req?.user || !requiredRoles.includes(req.user.role)) {
      throw new ForbiddenException(
        'No tiene permiso para realizar esta operación',
      );
    }

    return true;
  }
}
