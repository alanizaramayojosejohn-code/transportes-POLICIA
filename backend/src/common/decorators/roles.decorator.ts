import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles admitidos para una mutación (RolesGuard). El rol se lee del usuario
 * autenticado (JWT), no de un header simulado — spec 013.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
