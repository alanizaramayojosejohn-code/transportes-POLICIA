import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'transportes.auth';

const SESSION = {
  accessToken: 'token-abc',
  user: { id: 'u-1', username: 'jperez', fullName: 'Juan Pérez', role: 'TRANSPORTES' },
};

function setup() {
  TestBed.configureTestingModule({
    imports: [ApolloTestingModule],
    providers: [provideRouter([])],
  });
  const service = TestBed.inject(AuthService);
  const controller = TestBed.inject(ApolloTestingController);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  return { service, controller, navigate };
}

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('login guarda token y usuario, y deja la sesión abierta', async () => {
    const { service, controller } = setup();
    expect(service.isAuthenticated()).toBe(false);

    const login = service.login('jperez', 'secreta');
    const op = controller.expectOne('Login');
    expect(op.operation.variables).toEqual({ input: { username: 'jperez', password: 'secreta' } });
    op.flush({ data: { login: SESSION } });
    await login;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('token-abc');
    expect(service.currentUser()).toEqual(SESSION.user);
    controller.verify();
  });

  /// RF-12: la sesión sobrevive una recarga porque se persiste y se relee al construir.
  it('persiste la sesión y la restaura en el siguiente arranque', async () => {
    const first = setup();
    const login = first.service.login('jperez', 'secreta');
    first.controller.expectOne('Login').flush({ data: { login: SESSION } });
    await login;

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(SESSION);

    TestBed.resetTestingModule();
    const { service } = setup();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.username).toBe('jperez');
  });

  it('una sesión guardada ilegible no rompe el arranque: queda sin sesión', () => {
    localStorage.setItem(STORAGE_KEY, 'no-es-json');

    const { service } = setup();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  /// RF-13: cierre explícito.
  it('logout borra la sesión guardada y vuelve al login', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SESSION));
    const { service, navigate } = setup();

    await service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  /// RF-14: mismo efecto, pero disparado por el backend al rechazar el token.
  it('forceLogout borra la sesión guardada y vuelve al login', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SESSION));
    const { service, navigate } = setup();

    await service.forceLogout();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
