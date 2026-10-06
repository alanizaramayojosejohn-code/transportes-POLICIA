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
  /// Ficha de personal vinculada (`Personnel.userId`), si tiene. Base del
  /// alcance por unidad (spec 015) y de «Mi vehículo» (spec 014).
  personnelId: string | null;
  /// Unidades donde `personnelId` es encargado de transportes vigente
  /// (`TransportManagerAssignment` sin `endDate`). Vacío si no tiene ninguna
  /// o no tiene ficha de personal. `common/unit-scope.ts` es quien decide
  /// qué rol lo usa como acotamiento (spec 015, RF-12 a RF-15).
  managedUnitIds: string[];
}

/** Payload firmado dentro del JWT (spec 013, RF-1). */
export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}
