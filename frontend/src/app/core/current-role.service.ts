import { Injectable, signal } from '@angular/core';

/**
 * Catálogo de roles del sistema (base_datos_transportes_postgresql_final.sql,
 * sección 2). Sólo ADMINISTRADOR y TRANSPORTES pueden escribir; el resto son
 * de sólo consulta.
 */
export const ROLES = [
  'ADMINISTRADOR',
  'TRANSPORTES',
  'COMBUSTIBLE',
  'MANTENIMIENTO',
  'ALMACEN',
  'CONSULTA',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMINISTRADOR: 'Administrador',
  TRANSPORTES: 'Área de Transportes',
  COMBUSTIBLE: 'Combustible',
  MANTENIMIENTO: 'Mantenimiento',
  ALMACEN: 'Almacén',
  CONSULTA: 'Consulta',
};

const STORAGE_KEY = 'transportes.currentRole';

/**
 * Reemplazo temporal de la sesión real mientras no exista autenticación: el
 * rol activo se elige a mano en el topbar y viaja como header `x-user-role`
 * en cada petición GraphQL (ver `role.interceptor.ts`). El backend lo valida
 * con RolesGuard. Se reemplaza por el rol del usuario autenticado cuando
 * exista un spec de autenticación.
 */
@Injectable({ providedIn: 'root' })
export class CurrentRoleService {
  private readonly stored = (typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY)
    : null) as Role | null;

  readonly role = signal<Role>(
    this.stored && ROLES.includes(this.stored) ? this.stored : 'ADMINISTRADOR',
  );

  readonly canWrite = () => this.role() === 'ADMINISTRADOR' || this.role() === 'TRANSPORTES';

  setRole(role: Role): void {
    this.role.set(role);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, role);
    }
  }
}
