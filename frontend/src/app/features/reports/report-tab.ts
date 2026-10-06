import { Role } from '../../core/current-role.service';

export interface ReportTab {
  /** Ruta hija de `/reportes`. */
  readonly path: string;
  readonly label: string;
  readonly roles: readonly Role[];
}

/**
 * Catálogo de reportes (spec 018). Sólo están acá los reportes que no existen
 * como pantalla propia en otro módulo: los listados de Vehículos, Recorridos,
 * Combustible, Mantenimiento, Inventario, Incidentes, Conductores y
 * Asignaciones se consultan y exportan en su propio módulo, con sus propios
 * filtros, y repetirlos acá como tarjetas que sólo redirigen no agregaba nada.
 *
 * Cada pestaña es una ruta hija enlazable y con su propio `roleGuard`
 * (`app.routes.ts`); el acceso real lo decide el resolver (`@Roles`), esta
 * lista sólo decide qué pestañas se dibujan.
 */
export const REPORT_TABS: readonly ReportTab[] = [
  {
    path: 'combustible',
    label: 'Consumo de combustible',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'COMBUSTIBLE'],
  },
  {
    path: 'mantenimiento',
    label: 'Costos de mantenimiento',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'MANTENIMIENTO'],
  },
  {
    path: 'kilometraje',
    label: 'Kilometraje recorrido',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'COMBUSTIBLE'],
  },
  {
    path: 'movimientos-almacen',
    label: 'Movimientos de almacén',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'MANTENIMIENTO', 'ALMACEN'],
  },
  {
    path: 'historial-vehiculo',
    label: 'Historial del vehículo',
    // CONDUCTOR no ve el menú «Reportes» (spec 018, RF-1): llega acá sólo por
    // el enlace de «Mi vehículo», y ve su historial y nada más.
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'CONDUCTOR'],
  },
];

export function reportTabsFor(role: Role | null): readonly ReportTab[] {
  return role === null ? [] : REPORT_TABS.filter((tab) => tab.roles.includes(role));
}

/** Destino de `/reportes`, que no es una pantalla en sí: el primer reporte del rol. */
export function firstReportUrlFor(role: Role | null): string {
  const first = reportTabsFor(role)[0];
  return first ? `/reportes/${first.path}` : '/';
}
