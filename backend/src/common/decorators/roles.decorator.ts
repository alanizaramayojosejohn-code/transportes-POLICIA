import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles simulados admitidos para una mutación (RolesGuard). Placeholder
 * mientras no exista autenticación real: el rol viaja en el header
 * `x-user-role`, no en un JWT.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
