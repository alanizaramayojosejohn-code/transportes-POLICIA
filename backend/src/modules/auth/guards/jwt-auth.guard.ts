import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Guard global (registrado como `APP_GUARD` en `AuthModule`): toda la API
 * exige un JWT válido salvo lo marcado `@Public()` (spec 013). Reemplaza por
 * completo al header simulado `x-user-role`, que hasta ahora ni siquiera se
 * pedía en las queries.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext<{ req: unknown }>()
      .req;
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
