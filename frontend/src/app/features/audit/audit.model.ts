/** Acciones registradas (spec 019). `STATUS_CHANGE` es la baja/reactivación. */
export type AuditAction =
  'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT';

/**
 * Sólo las cinco acciones que el sistema genera hoy. `LOGOUT`, `APPROVE` y
 * `REJECT` existen en el enum pero ningún flujo las produce (spec 019, «Fuera
 * de alcance»), así que no se ofrecen como filtro.
 */
export const AUDIT_ACTIONS: AuditAction[] = [
  'CREATE',
  'UPDATE',
  'STATUS_CHANGE',
  'DELETE',
  'LOGIN',
];

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  STATUS_CHANGE: 'Cambio de estado',
  DELETE: 'Eliminación',
  LOGIN: 'Acceso',
  LOGOUT: 'Cierre de sesión',
  APPROVE: 'Aprobación',
  REJECT: 'Rechazo',
};

export const AUDIT_ACTION_TONE: Record<AuditAction, 'green' | 'blue' | 'amber' | 'red' | 'gray'> = {
  CREATE: 'green',
  UPDATE: 'blue',
  STATUS_CHANGE: 'amber',
  DELETE: 'red',
  LOGIN: 'gray',
  LOGOUT: 'gray',
  APPROVE: 'green',
  REJECT: 'red',
};

/**
 * Módulos que puede devolver el backend, en el orden de la maqueta. El módulo
 * es una proyección de la entidad, no una columna: el filtro envía este código
 * y el backend lo traduce a las entidades que lo componen.
 */
export const AUDIT_MODULES = [
  'VEHICULOS',
  'ASIGNACIONES',
  'CONDUCTORES',
  'UNIDADES',
  'RECORRIDOS',
  'COMBUSTIBLE',
  'MANTENIMIENTO',
  'INVENTARIO',
  'INCIDENTES',
  'DOCUMENTACION',
  'USUARIOS',
  'TRAMITES',
  'SESION',
] as const;

export type AuditModule = (typeof AUDIT_MODULES)[number];

export const AUDIT_MODULE_LABEL: Record<string, string> = {
  VEHICULOS: 'Vehículos',
  ASIGNACIONES: 'Asignaciones',
  CONDUCTORES: 'Conductores',
  UNIDADES: 'Unidades',
  RECORRIDOS: 'Recorridos',
  COMBUSTIBLE: 'Combustible',
  MANTENIMIENTO: 'Mantenimiento',
  INVENTARIO: 'Inventario',
  INCIDENTES: 'Incidentes',
  DOCUMENTACION: 'Documentación',
  USUARIOS: 'Usuarios',
  TRAMITES: 'Trámites',
  SESION: 'Sesión',
  OTROS: 'Otros',
};

export interface AuditLogUser {
  id: string;
  username: string;
  fullName: string;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  module: string;
  description: string;
  /// JSON ya serializado por el backend; la ficha lo muestra tal cual.
  after: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  /// Nulo si la cuenta fue eliminada (spec 019, RF-17).
  user: AuditLogUser | null;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
}

export interface AuditSummary {
  total: number;
  today: number;
  created: number;
  updated: number;
}

export interface AuditLogFilter {
  search?: string;
  module?: string;
  action?: AuditAction;
  date?: string;
  skip?: number;
  take?: number;
}
