import { computed, Injectable } from '@angular/core';
import { AuthService } from './auth.service';

/** Catálogo de roles del sistema (base_datos_transportes_postgresql_final.sql, sección 2). */
export const ROLES = [
  'ADMINISTRADOR',
  'TRANSPORTES',
  'COMBUSTIBLE',
  'MANTENIMIENTO',
  'ALMACEN',
  'CONSULTA',
  'CONDUCTOR',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMINISTRADOR: 'Administrador',
  TRANSPORTES: 'Área de Transportes',
  COMBUSTIBLE: 'Combustible',
  MANTENIMIENTO: 'Mantenimiento',
  ALMACEN: 'Almacén',
  CONSULTA: 'Consulta',
  CONDUCTOR: 'Conductor',
};

/**
 * Rol del usuario autenticado (spec 013). Antes era un selector simulado en
 * el topbar que el usuario elegía a mano (`x-user-role`); ahora se deriva de
 * `AuthService.currentUser()`. Conserva la misma API pública (`role`,
 * `canWrite*`) para no tocar los componentes que ya la consumían.
 */
@Injectable({ providedIn: 'root' })
export class CurrentRoleService {
  constructor(private readonly auth: AuthService) {}

  readonly role = computed<Role | null>(() => {
    const role = this.auth.currentUser()?.role;
    return role && (ROLES as readonly string[]).includes(role) ? (role as Role) : null;
  });

  readonly canWrite = () => this.role() === 'ADMINISTRADOR' || this.role() === 'TRANSPORTES';

  /// Combustible, además de ADMINISTRADOR/TRANSPORTES, puede registrar
  /// abastecimientos (spec 007). Mismo patrón para Mantenimiento/Almacén.
  readonly canWriteFuel = () => this.canWrite() || this.role() === 'COMBUSTIBLE';

  /// Mantenimiento, además de ADMINISTRADOR/TRANSPORTES, puede registrar y
  /// finalizar órdenes de mantenimiento (spec 008).
  readonly canWriteMaintenance = () => this.canWrite() || this.role() === 'MANTENIMIENTO';

  /// Almacén, además de ADMINISTRADOR/TRANSPORTES, puede administrar el
  /// catálogo de repuestos y registrar movimientos de inventario (spec 009).
  readonly canWriteInventory = () => this.canWrite() || this.role() === 'ALMACEN';
}
