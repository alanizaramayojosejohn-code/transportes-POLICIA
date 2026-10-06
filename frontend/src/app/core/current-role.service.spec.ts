import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService, AuthUser } from './auth.service';
import { CurrentRoleService, Role } from './current-role.service';

function withRole(role: string | null): CurrentRoleService {
  const currentUser = signal<AuthUser | null>(
    role === null ? null : { id: '1', username: 'u', fullName: 'Usuario', role },
  );
  TestBed.configureTestingModule({
    providers: [CurrentRoleService, { provide: AuthService, useValue: { currentUser } }],
  });
  return TestBed.inject(CurrentRoleService);
}

/// Matriz de escritura por rol (specs 007/008/009/013/014). Cada fila es «qué puede escribir
/// este rol»; lo que no está listado, no puede.
const WRITE_MATRIX: Record<Role, ReadonlyArray<keyof Permissions>> = {
  ADMINISTRADOR: [
    'canWrite',
    'canWriteTrips',
    'canWriteFuel',
    'canWriteMaintenance',
    'canWriteInventory',
  ],
  TRANSPORTES: [
    'canWrite',
    'canWriteTrips',
    'canWriteFuel',
    'canWriteMaintenance',
    'canWriteInventory',
  ],
  COMBUSTIBLE: ['canWriteFuel'],
  MANTENIMIENTO: ['canWriteMaintenance'],
  ALMACEN: ['canWriteInventory'],
  CONSULTA: [],
  CONDUCTOR: ['canWriteTrips', 'canWriteFuel'],
};

interface Permissions {
  canWrite: boolean;
  canWriteTrips: boolean;
  canWriteFuel: boolean;
  canWriteMaintenance: boolean;
  canWriteInventory: boolean;
}

const ALL_PERMISSIONS = [
  'canWrite',
  'canWriteTrips',
  'canWriteFuel',
  'canWriteMaintenance',
  'canWriteInventory',
] as const;

describe('CurrentRoleService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('sin sesión no hay rol ni permiso de escritura', () => {
    const service = withRole(null);

    expect(service.role()).toBeNull();
    for (const permission of ALL_PERMISSIONS) {
      expect(service[permission]()).toBe(false);
    }
  });

  /// Un código de rol que el frontend no conoce (backend nuevo, dato corrupto) no debe
  /// interpretarse como un rol válido: se trata como sin rol.
  it('un código de rol desconocido se descarta', () => {
    const service = withRole('SUPERUSUARIO');

    expect(service.role()).toBeNull();
    expect(service.canWrite()).toBe(false);
  });

  for (const [role, allowed] of Object.entries(WRITE_MATRIX) as [
    Role,
    ReadonlyArray<keyof Permissions>,
  ][]) {
    it(`${role}: escribe exactamente ${allowed.length > 0 ? allowed.join(', ') : 'nada'}`, () => {
      const service = withRole(role);

      expect(service.role()).toBe(role);
      for (const permission of ALL_PERMISSIONS) {
        expect({ permission, value: service[permission]() }).toEqual({
          permission,
          value: allowed.includes(permission),
        });
      }
    });
  }
});
