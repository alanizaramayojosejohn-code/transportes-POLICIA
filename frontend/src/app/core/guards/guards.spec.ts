import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthService, AuthUser } from '../auth.service';
import { CurrentRoleService, Role } from '../current-role.service';
import { authGuard } from './auth.guard';
import { homeGuard, roleGuard } from './role.guard';

function configure(role: Role | null): void {
  const currentUser = signal<AuthUser | null>(
    role === null ? null : { id: '1', username: 'u', fullName: 'Usuario', role },
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      CurrentRoleService,
      {
        provide: AuthService,
        useValue: { currentUser, isAuthenticated: () => currentUser() !== null },
      },
    ],
  });
}

const route = {} as ActivatedRouteSnapshot;
const stateFor = (url: string) => ({ url }) as RouterStateSnapshot;

function run<T>(guard: () => T): T {
  return TestBed.runInInjectionContext(guard);
}

function urlOf(result: boolean | UrlTree): string {
  return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : String(result);
}

describe('authGuard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('con sesión deja pasar', () => {
    configure('ADMINISTRADOR');

    expect(run(() => authGuard(route, stateFor('/vehiculos')))).toBe(true);
  });

  /// RF-11: la URL pedida viaja en `returnUrl` para volver ahí después de loguearse.
  it('sin sesión redirige a /login recordando la URL pedida', () => {
    configure(null);

    const result = run(() => authGuard(route, stateFor('/vehiculos'))) as UrlTree;

    expect(urlOf(result)).toBe('/login?returnUrl=%2Fvehiculos');
  });
});

describe('roleGuard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deja pasar al rol permitido', () => {
    configure('ALMACEN');

    expect(run(() => roleGuard(['ADMINISTRADOR', 'ALMACEN'])(route, stateFor('/inventario')))).toBe(
      true,
    );
  });

  /// RF-10: con sesión pero sin el rol, vuelve a inicio en vez de mostrar la sección.
  it('manda a inicio al rol no permitido', () => {
    configure('CONDUCTOR');

    const result = run(() =>
      roleGuard(['ADMINISTRADOR'])(route, stateFor('/auditoria')),
    ) as UrlTree;

    expect(urlOf(result)).toBe('/');
  });

  it('sin rol tampoco deja pasar', () => {
    configure(null);

    const result = run(() =>
      roleGuard(['ADMINISTRADOR'])(route, stateFor('/auditoria')),
    ) as UrlTree;

    expect(urlOf(result)).toBe('/');
  });
});

describe('homeGuard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  /// Spec 012: el CONDUCTOR no tiene panel general; su inicio es «Mi vehículo».
  it('envía al CONDUCTOR a /mi-vehiculo', () => {
    configure('CONDUCTOR');

    const result = run(() => homeGuard(route, stateFor('/'))) as UrlTree;

    expect(urlOf(result)).toBe('/mi-vehiculo');
  });

  it('deja el panel general a los demás roles', () => {
    configure('TRANSPORTES');

    expect(run(() => homeGuard(route, stateFor('/')))).toBe(true);
  });
});
