import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service.js';
import { AuthPayload, AuthUser } from './entities/auth-payload.entity.js';
import { LoginInput } from './dto/login.input.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './auth.types.js';

/**
 * Puerta GraphQL de sesión (spec 013). `login` es la única operación de
 * toda la API marcada `@Public()`; el resto exige JWT por el guard global.
 */
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }

  /// Permite al frontend restaurar la sesión al recargar la página (RF-12)
  /// sin volver a pedir usuario y contraseña.
  @Query(() => AuthUser)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
