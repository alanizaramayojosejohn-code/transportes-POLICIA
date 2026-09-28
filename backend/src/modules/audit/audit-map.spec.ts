import { describe, expect, it } from 'vitest';
import { AuditAction } from '../../generated/prisma/enums.js';
import {
  actionForMutation,
  describe as describeEvent,
  entitiesForModule,
  entityForMutation,
  entityIdFrom,
  labelFor,
  moduleForEntity,
  REDACTED_MARK,
  sanitize,
} from './audit-map.js';

describe('actionForMutation (spec 019, RF-2)', () => {
  it.each([
    ['createVehicle', AuditAction.CREATE],
    ['assignVehicleDriver', AuditAction.CREATE],
    ['registerStockMovement', AuditAction.CREATE],
    ['setVehiclePhoto', AuditAction.CREATE],
    ['updateVehicle', AuditAction.UPDATE],
    ['closeTrip', AuditAction.UPDATE],
    ['finishMaintenanceOrder', AuditAction.UPDATE],
    ['deactivateUser', AuditAction.STATUS_CHANGE],
    ['reactivateUser', AuditAction.STATUS_CHANGE],
    ['deleteProcedureType', AuditAction.DELETE],
    ['removeVehiclePhoto', AuditAction.DELETE],
    ['login', AuditAction.LOGIN],
  ])('%s → %s', (mutation, expected) => {
    expect(actionForMutation(mutation)).toBe(expected);
  });

  it('distingue baja/reactivación de una edición normal (decisión del spec 019)', () => {
    expect(actionForMutation('deactivateUser')).toBe(AuditAction.STATUS_CHANGE);
    expect(actionForMutation('updateUser')).toBe(AuditAction.UPDATE);
  });

  it('devuelve null si ningún prefijo coincide', () => {
    expect(actionForMutation('recalcularAlgo')).toBeNull();
  });
});

describe('entityForMutation y moduleForEntity (spec 019, RF-3/RF-6)', () => {
  it('resuelve la entidad padre cuando la mutation devuelve una lista de ítems', () => {
    expect(entityForMutation('updateVehicleChecklist')).toBe('Vehicle');
    expect(entityForMutation('updateFuelRecordChecklist')).toBe('FuelRecord');
  });

  it('devuelve null para una mutation no declarada (no se audita)', () => {
    expect(entityForMutation('mutationInventada')).toBeNull();
  });

  it('proyecta la entidad a su módulo de interfaz', () => {
    expect(moduleForEntity('Vehicle')).toBe('VEHICULOS');
    expect(moduleForEntity('StockMovement')).toBe('INVENTARIO');
    expect(moduleForEntity('EntidadDesconocida')).toBe('OTROS');
  });

  it('entitiesForModule es la inversa de moduleForEntity', () => {
    const entities = entitiesForModule('INVENTARIO');

    expect(entities).toContain('SparePart');
    expect(entities).toContain('StockMovement');
    for (const entity of entities) {
      expect(moduleForEntity(entity)).toBe('INVENTARIO');
    }
  });

  it('un módulo inexistente devuelve lista vacía, no todas las entidades', () => {
    expect(entitiesForModule('NO_EXISTE')).toEqual([]);
  });
});

describe('labelFor (spec 019, RF-5)', () => {
  it('toma el identificador de negocio propio de la entidad', () => {
    expect(labelFor('Vehicle', { plate: '6417-PBT' })).toBe('6417-PBT');
    expect(labelFor('User', { username: 'jperez' })).toBe('jperez');
    expect(labelFor('SparePart', { code: 'LUB-001' })).toBe('LUB-001');
  });

  it('compone varios campos cuando la entidad los declara', () => {
    expect(
      labelFor('Personnel', { firstName: 'Juan', lastName: 'Pérez' }),
    ).toBe('Juan Pérez');
  });

  it('omite los campos ausentes o vacíos al componer', () => {
    expect(labelFor('Personnel', { firstName: 'Juan', lastName: '  ' })).toBe(
      'Juan',
    );
    expect(labelFor('Unit', { code: null, name: 'EPI 3' })).toBe('EPI 3');
  });

  it('devuelve null si la entidad no declara campos de etiqueta', () => {
    expect(labelFor('Trip', { destination: 'Oruro' })).toBeNull();
    expect(labelFor('StockMovement', { type: 'OUT' })).toBeNull();
  });

  it('devuelve null si ningún campo declarado vino con valor', () => {
    expect(labelFor('Vehicle', { brand: 'Toyota' })).toBeNull();
    expect(labelFor('Vehicle', true)).toBeNull();
  });
});

describe('entityIdFrom (spec 019, RF-4)', () => {
  it('prefiere el id del resultado', () => {
    expect(entityIdFrom({ id: 'v1' }, { vehicleId: 'v2' })).toBe('v1');
  });

  it('cae a los argumentos cuando el resultado no tiene id (retorno Boolean)', () => {
    expect(entityIdFrom(true, { vehicleId: 'v2', slotKey: 'frontal' })).toBe(
      'v2',
    );
    expect(entityIdFrom(true, { id: 'p1' })).toBe('p1');
  });

  it('cae a los argumentos cuando el resultado es una lista de ítems', () => {
    expect(entityIdFrom([{ id: 'i1' }], { fuelRecordId: 'f1' })).toBe('f1');
  });

  it('devuelve null si no hay identificador en ninguna parte', () => {
    expect(entityIdFrom(true, {})).toBeNull();
  });
});

describe('sanitize (spec 019, RF-8)', () => {
  it('excluye las credenciales del payload', () => {
    const result = sanitize({
      username: 'jperez',
      password: 'secreta',
    }) as Record<string, unknown>;

    expect(result.username).toBe('jperez');
    expect(result.password).toBe(REDACTED_MARK);
  });

  it('excluye el token del resultado de login', () => {
    const result = sanitize({
      accessToken: 'ey.J...',
      user: { id: 'u1' },
    }) as Record<string, unknown>;

    expect(result.accessToken).toBe(REDACTED_MARK);
  });

  it('excluye la foto en base64 para no duplicarla dentro de audit_log', () => {
    const result = sanitize({
      slotKey: 'frontal',
      dataUrl: 'data:image/png;base64,AAAA',
    }) as Record<string, unknown>;

    expect(result.slotKey).toBe('frontal');
    expect(result.dataUrl).toBe(REDACTED_MARK);
  });

  it('marca el campo excluido en vez de omitirlo, para que se vea que venía', () => {
    const result = sanitize({ password: 'x' }) as Record<string, unknown>;

    expect(Object.keys(result)).toContain('password');
  });

  it('excluye también los campos anidados y dentro de listas', () => {
    const result = sanitize({
      input: { nested: { password: 'x' } },
      items: [{ dataUrl: 'data:...' }, { code: 'OK' }],
    }) as Record<string, unknown>;

    const input = result.input as Record<string, Record<string, unknown>>;
    const items = result.items as Record<string, unknown>[];

    expect(input.nested.password).toBe(REDACTED_MARK);
    expect(items[0].dataUrl).toBe(REDACTED_MARK);
    expect(items[1].code).toBe('OK');
  });

  it('serializa las fechas y deja intactos los valores primitivos', () => {
    const date = new Date('2026-09-28T10:00:00.000Z');

    expect(sanitize(date)).toBe('2026-09-28T10:00:00.000Z');
    expect(sanitize('texto')).toBe('texto');
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBeNull();
  });
});

describe('describe (spec 019, RF-21)', () => {
  it('compone acción + entidad + etiqueta', () => {
    expect(describeEvent(AuditAction.UPDATE, 'Vehicle', '6417-PBT')).toBe(
      'Modificación de vehículo 6417-PBT',
    );
    expect(describeEvent(AuditAction.STATUS_CHANGE, 'User', 'jperez')).toBe(
      'Cambio de estado de usuario jperez',
    );
  });

  it('omite la etiqueta cuando la entidad no tiene una', () => {
    expect(describeEvent(AuditAction.CREATE, 'Trip', null)).toBe(
      'Creación de recorrido',
    );
  });

  it('lee el acceso al sistema distinto: no actúa sobre un registro', () => {
    expect(describeEvent(AuditAction.LOGIN, 'Session', 'jperez')).toBe(
      'Acceso al sistema',
    );
  });
});
