import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  /// Código del rol (`Role.code`): ADMINISTRADOR, TRANSPORTES, COMBUSTIBLE...
  role: string;
}

interface StoredSession {
  accessToken: string;
  user: AuthUser;
}

const STORAGE_KEY = 'transportes.auth';

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        username
        fullName
        role
      }
    }
  }
`;

interface LoginMutationResult {
  login: StoredSession;
}

/**
 * Sesión real del sistema (spec 013): reemplaza al selector de rol simulado
 * (`CurrentRoleService`) y al header `x-user-role`. Token y usuario se leen
 * de `localStorage` de forma síncrona al construir el servicio (mismo patrón
 * que `ThemeService`), así que sobreviven una recarga sin pedir loguearse de
 * nuevo (RF-12) mientras el token no haya expirado.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stored = this.readStored();

  readonly token = signal<string | null>(this.stored?.accessToken ?? null);
  readonly currentUser = signal<AuthUser | null>(this.stored?.user ?? null);
  readonly isAuthenticated = computed(() => this.token() !== null);

  constructor(
    private readonly apollo: Apollo,
    private readonly router: Router,
  ) {}

  async login(username: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.apollo.mutate<LoginMutationResult>({
        mutation: LOGIN_MUTATION,
        variables: { input: { username, password } },
      }),
    );
    this.setSession(result.data!.login);
  }

  /// RF-13: cierre de sesión explícito.
  async logout(): Promise<void> {
    this.clearSession();
    await this.apollo.client.clearStore();
    await this.router.navigateByUrl('/login');
  }

  /// RF-14: mismo efecto que un cierre de sesión explícito, pero disparado
  /// por el interceptor ante un 401 (token vencido o rechazado), no por el
  /// usuario. Sin `clearStore` (evita relanzar las queries que fallaron).
  async forceLogout(): Promise<void> {
    this.clearSession();
    await this.router.navigateByUrl('/login');
  }

  private setSession(session: StoredSession): void {
    this.token.set(session.accessToken);
    this.currentUser.set(session.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  private clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private readStored(): StoredSession | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }
}
