import { AuditAction } from '../../generated/prisma/enums.js';

/**
 * Tablas declarativas que traducen una mutation GraphQL a una fila de
 * auditoría (spec 019, RF-2 a RF-8). Están separadas del interceptor para
 * poder probarlas sin montar un contexto de NestJS, y para que agregar una
 * mutation nueva sea editar datos, no lógica.
 */

/**
 * Prefijo del nombre de la mutation → acción (spec 019, RF-2). El orden
 * importa: se evalúa el primero que coincida, así que los prefijos más
 * específicos van antes que los genéricos.
 */
const ACTION_BY_PREFIX: readonly (readonly [string, AuditAction])[] = [
  ['login', AuditAction.LOGIN],
  ['deactivate', AuditAction.STATUS_CHANGE],
  ['reactivate', AuditAction.STATUS_CHANGE],
  ['delete', AuditAction.DELETE],
  ['remove', AuditAction.DELETE],
  ['create', AuditAction.CREATE],
  ['assign', AuditAction.CREATE],
  ['register', AuditAction.CREATE],
  ['set', AuditAction.CREATE],
  ['update', AuditAction.UPDATE],
  ['close', AuditAction.UPDATE],
  ['finish', AuditAction.UPDATE],
];

/**
 * Entidad afectada por cada mutation (spec 019, RF-3). Se declara en vez de
 * leerse del tipo de retorno porque cinco mutations no lo tienen utilizable:
 * dos devuelven `Boolean` y cuatro devuelven una lista de ítems de checklist,
 * cuyo evento corresponde a la entidad padre, no a cada ítem.
 *
 * Una mutation ausente de esta tabla no se audita, y `audit.interceptor.spec`
 * falla si el esquema tiene mutations que no estén aquí: es la red que evita
 * que la mutation 48 quede sin rastro por olvido.
 */
const ENTITY_BY_MUTATION: Readonly<Record<string, string>> = {
  login: 'Session',

  createVehicle: 'Vehicle',
  updateVehicle: 'Vehicle',
  registerVehicleCondition: 'VehicleCondition',
  updateVehicleChecklist: 'Vehicle',
  setVehiclePhoto: 'VehiclePhoto',
  removeVehiclePhoto: 'VehiclePhoto',

  createUnit: 'Unit',
  updateUnit: 'Unit',
  deactivateUnit: 'Unit',
  reactivateUnit: 'Unit',
  assignTransportManager: 'TransportManagerAssignment',
  closeTransportManagerAssignment: 'TransportManagerAssignment',

  createUnitAssignment: 'UnitAssignment',
  closeUnitAssignment: 'UnitAssignment',
  updateUnitAssignmentNotes: 'UnitAssignment',

  createUser: 'User',
  updateUser: 'User',
  deactivateUser: 'User',
  reactivateUser: 'User',

  createPersonnel: 'Personnel',
  updatePersonnel: 'Personnel',
  deactivatePersonnel: 'Personnel',
  reactivatePersonnel: 'Personnel',
  assignVehicleDriver: 'VehicleDriverAssignment',
  closeVehicleDriverAssignment: 'VehicleDriverAssignment',

  createTrip: 'Trip',
  closeTrip: 'Trip',
  registerOdometerReading: 'OdometerReading',

  createFuelRecord: 'FuelRecord',
  updateFuelRecordChecklist: 'FuelRecord',

  createMaintenanceOrder: 'MaintenanceOrder',
  finishMaintenanceOrder: 'MaintenanceOrder',
  updateMaintenanceOrderChecklist: 'MaintenanceOrder',

  createSparePart: 'SparePart',
  updateSparePart: 'SparePart',
  deactivateSparePart: 'SparePart',
  reactivateSparePart: 'SparePart',
  registerStockMovement: 'StockMovement',
  updateStockMovementChecklist: 'StockMovement',

  createVehicleDocument: 'VehicleDocument',
  createIncident: 'Incident',

  createProcedureType: 'ProcedureType',
  updateProcedureType: 'ProcedureType',
  deactivateProcedureType: 'ProcedureType',
  reactivateProcedureType: 'ProcedureType',
  deleteProcedureType: 'ProcedureType',
};

/**
 * Entidad → módulo de la interfaz (spec 019, RF-6). No es una columna de
 * `audit_log`: es una proyección, igual que la descripción del evento.
 */
const MODULE_BY_ENTITY: Readonly<Record<string, string>> = {
  Session: 'SESION',
  Vehicle: 'VEHICULOS',
  VehicleCondition: 'VEHICULOS',
  VehiclePhoto: 'VEHICULOS',
  Unit: 'UNIDADES',
  TransportManagerAssignment: 'UNIDADES',
  UnitAssignment: 'ASIGNACIONES',
  Personnel: 'CONDUCTORES',
  VehicleDriverAssignment: 'CONDUCTORES',
  Trip: 'RECORRIDOS',
  OdometerReading: 'RECORRIDOS',
  FuelRecord: 'COMBUSTIBLE',
  MaintenanceOrder: 'MANTENIMIENTO',
  SparePart: 'INVENTARIO',
  StockMovement: 'INVENTARIO',
  VehicleDocument: 'DOCUMENTACION',
  Incident: 'INCIDENTES',
  User: 'USUARIOS',
  ProcedureType: 'TRAMITES',
};

/**
 * Campo del que sale la etiqueta legible de cada entidad (spec 019, RF-5).
 * Las entidades ausentes no tienen identificador de negocio propio (`Trip`,
 * `FuelRecord`, `StockMovement` y las tres tablas de asignación): su etiqueta
 * queda nula a propósito, porque resolver la placa del vehículo relacionado
 * costaría una consulta extra por operación (spec 019, RNF).
 */
const LABEL_FIELDS_BY_ENTITY: Readonly<Record<string, readonly string[]>> = {
  Session: ['username'],
  Vehicle: ['plate'],
  VehicleCondition: ['code'],
  VehiclePhoto: ['slotKey'],
  Unit: ['code', 'name'],
  User: ['username'],
  Personnel: ['firstName', 'lastName'],
  SparePart: ['code'],
  MaintenanceOrder: ['code'],
  Incident: ['code'],
  VehicleDocument: ['documentNumber'],
  ProcedureType: ['name'],
};

/**
 * Nombres de argumento que identifican al registro afectado, en orden de
 * preferencia (spec 019, RF-4). Se usan cuando el resultado de la mutation no
 * trae `id` propio: retornos `Boolean` y listas de ítems de checklist.
 */
const ID_ARG_NAMES: readonly string[] = [
  'id',
  'vehicleId',
  'unitId',
  'fuelRecordId',
  'maintenanceOrderId',
  'stockMovementId',
  'sparePartId',
  'personnelId',
  'userId',
  'tripId',
];

/**
 * Campos que nunca se guardan en `after` (spec 019, RF-8): los primeros son
 * credenciales (`password` viaja en `login`, `createUser` y `updateUser`;
 * `accessToken` en el resultado de `login`) y `dataUrl` es la foto del
 * vehículo en base64, que duplicaría cada imagen dentro de `audit_log`.
 */
const REDACTED_FIELDS: ReadonlySet<string> = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'dataUrl',
]);

/** Marca que reemplaza a un campo excluido, para que el rastro muestre que venía en la operación. */
export const REDACTED_MARK = '[omitido]';

/** Acción correspondiente al nombre de la mutation, o `null` si ningún prefijo coincide. */
export function actionForMutation(mutationName: string): AuditAction | null {
  const match = ACTION_BY_PREFIX.find(([prefix]) =>
    mutationName.startsWith(prefix),
  );
  return match ? match[1] : null;
}

/** Entidad afectada, o `null` si la mutation no está declarada (no se audita). */
export function entityForMutation(mutationName: string): string | null {
  return ENTITY_BY_MUTATION[mutationName] ?? null;
}

/** Módulo de la interfaz al que pertenece la entidad. */
export function moduleForEntity(entity: string): string {
  return MODULE_BY_ENTITY[entity] ?? 'OTROS';
}

/**
 * Entidades que componen un módulo. Es la proyección inversa de
 * `moduleForEntity`, necesaria para filtrar por módulo: la consulta filtra por
 * `entity IN (...)` porque el módulo no es una columna (spec 019, RF-6/RF-14).
 * Un módulo desconocido devuelve lista vacía, que la consulta interpreta como
 * «ningún resultado» en vez de ignorar el filtro en silencio.
 */
export function entitiesForModule(module: string): string[] {
  return Object.entries(MODULE_BY_ENTITY)
    .filter(([, name]) => name === module)
    .map(([entity]) => entity);
}

/** Etiqueta en español de cada acción, para la descripción y la interfaz. */
const ACTION_LABEL: Readonly<Record<AuditAction, string>> = {
  [AuditAction.CREATE]: 'Creación',
  [AuditAction.UPDATE]: 'Modificación',
  [AuditAction.STATUS_CHANGE]: 'Cambio de estado',
  [AuditAction.DELETE]: 'Eliminación',
  [AuditAction.LOGIN]: 'Acceso',
  [AuditAction.LOGOUT]: 'Cierre de sesión',
  [AuditAction.APPROVE]: 'Aprobación',
  [AuditAction.REJECT]: 'Rechazo',
};

/** Nombre en español de la entidad, para la descripción del evento. */
const ENTITY_LABEL: Readonly<Record<string, string>> = {
  Session: 'sesión',
  Vehicle: 'vehículo',
  VehicleCondition: 'condición de vehículo',
  VehiclePhoto: 'fotografía de vehículo',
  Unit: 'unidad',
  TransportManagerAssignment: 'designación de encargado',
  UnitAssignment: 'asignación de unidad',
  Personnel: 'personal',
  VehicleDriverAssignment: 'encargo de conductor',
  Trip: 'recorrido',
  OdometerReading: 'lectura de kilometraje',
  FuelRecord: 'abastecimiento',
  MaintenanceOrder: 'orden de mantenimiento',
  SparePart: 'artículo de inventario',
  StockMovement: 'movimiento de almacén',
  VehicleDocument: 'documento de vehículo',
  Incident: 'incidente',
  User: 'usuario',
  ProcedureType: 'tipo de trámite',
};

/**
 * Descripción legible del evento, compuesta al leer (spec 019, RF-21): no hay
 * columna de descripción porque es una proyección de datos que ya están en la
 * fila. Un `LOGIN` se lee distinto («Acceso al sistema») porque no actúa sobre
 * un registro de negocio.
 */
export function describe(
  action: AuditAction,
  entity: string,
  entityLabel: string | null,
): string {
  if (action === AuditAction.LOGIN || action === AuditAction.LOGOUT) {
    return `${ACTION_LABEL[action]} al sistema`;
  }

  const subject = ENTITY_LABEL[entity] ?? entity;
  return entityLabel
    ? `${ACTION_LABEL[action]} de ${subject} ${entityLabel}`
    : `${ACTION_LABEL[action]} de ${subject}`;
}

/** Nombres de mutation declarados; `audit.interceptor.spec` los cruza con el esquema. */
export function auditedMutationNames(): string[] {
  return Object.keys(ENTITY_BY_MUTATION);
}

/**
 * Etiqueta legible del registro afectado, compuesta de los campos declarados
 * para su entidad. Devuelve `null` si la entidad no declara campos o si
 * ninguno vino con valor.
 */
export function labelFor(entity: string, source: unknown): string | null {
  const fields = LABEL_FIELDS_BY_ENTITY[entity];
  if (!fields || !isRecord(source)) return null;

  const parts = fields
    .map((field) => source[field])
    .filter(
      (value): value is string | number =>
        typeof value === 'string' || typeof value === 'number',
    )
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Identificador del registro afectado: el `id` del resultado si lo tiene; si
 * no, el primer argumento identificador reconocido (spec 019, RF-4).
 */
export function entityIdFrom(
  result: unknown,
  args: Record<string, unknown>,
): string | null {
  if (isRecord(result) && typeof result.id === 'string') return result.id;

  for (const name of ID_ARG_NAMES) {
    const value = args[name];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

/**
 * Copia el payload sin los campos sensibles, recursivamente (spec 019, RF-8).
 * Las listas se recorren igual, para que un argumento como `items` tampoco
 * cuele un campo excluido anidado.
 */
export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value instanceof Date) return value.toISOString();
  if (!isRecord(value)) return value;

  const output: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    output[key] = REDACTED_FIELDS.has(key) ? REDACTED_MARK : sanitize(inner);
  }
  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
