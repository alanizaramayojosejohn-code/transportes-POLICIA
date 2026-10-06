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

/**
 * Un CONDUCTOR no tiene panel general (spec 012): «Inicio» para ese rol es
 * «Mi vehículo». Sin este guard, entrar sin `returnUrl` (login o navegar a
 * `/` a mano) mostraría el panel administrativo, que ese rol ni ve en el nav.
 */
export const homeGuard: CanActivateFn = () => {
  const currentRole = inject(CurrentRoleService);
  const router = inject(Router);

  if (currentRole.role() === 'CONDUCTOR') {
    return router.createUrlTree(['/mi-vehiculo']);
  }
  return true;
};
