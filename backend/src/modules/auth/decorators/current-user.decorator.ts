import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthenticatedUser } from '../auth.types.js';

/**
 * Usuario autenticado de la petición (`req.user`, puesto por `JwtStrategy`).
 * Reemplaza el `extractRole(context)` que cada resolver repetía para leer el
 * header simulado `x-user-role`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    return GqlExecutionContext.create(context).getContext<{
      req: { user: AuthenticatedUser };
    }>().req.user;
  },
);
