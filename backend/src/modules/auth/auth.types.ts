/**
 * Forma del usuario autenticado que `JwtStrategy` deja en `req.user`. La
 * consumen `RolesGuard`, `@CurrentUser()` y `AuthResolver.me`.
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  /// Código del rol (`Role.code`), no el objeto completo: es lo único que
  /// necesitan RolesGuard y el frontend (ROLE_LABEL ya mapea código → texto).
  role: string;
}

/** Payload firmado dentro del JWT (spec 013, RF-1). */
export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}
