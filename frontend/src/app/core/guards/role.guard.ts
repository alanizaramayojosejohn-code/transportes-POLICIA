import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CurrentRoleService, Role } from '../current-role.service';

/**
 * Con sesión activa pero sin el rol requerido, redirige a inicio en vez de
 * mostrar la sección (spec 013, RF-10). `authGuard` corre antes en la ruta
 * (ver `app.routes.ts`) y garantiza que ya haya un rol.
 */
export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return () => {
    const currentRole = inject(CurrentRoleService);
    const router = inject(Router);

    const role = currentRole.role();
    if (role !== null && allowedRoles.includes(role)) {
      return true;
    }
    return router.createUrlTree(['/']);
  };
};
