import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CurrentRoleService, ROLE_LABEL, Role } from '../../core/current-role.service';
import { PwaInstallService } from '../../core/pwa-install.service';
import { ThemeService } from '../../core/theme.service';
import { ButtonDirective } from '../../shared/button/button.directive';
import { IconComponent, IconName } from '../../shared/icon/icon.component';

interface NavChild {
  readonly path: string;
  readonly label: string;
  readonly badge?: string;
}

interface NavEntry {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  /** Presente en los ítems simples (Inicio, Reportes); ausente en los grupos. */
  readonly path?: string;
  /** Presente en los grupos colapsables; ausente en los ítems simples. */
  readonly children?: readonly NavChild[];
}

/** Árbol de navegación de la maqueta (`prototipo/index.html:297-442`). El badge de Inventario
 * está fijo en "5", igual que en la maqueta (no se recalcula desde datos reales). */
const BASE_NAV: readonly NavEntry[] = [
  { key: 'dashboard', label: 'Inicio', icon: 'home', path: '/' },
  {
    key: 'gestionVehicular',
    label: 'Gestión Vehicular',
    icon: 'vehicle',
    children: [
      { path: '/vehiculos', label: 'Vehículos' },
      { path: '/asignaciones', label: 'Asignaciones' },
      { path: '/conductores', label: 'Conductores' },
      { path: '/unidades', label: 'Unidades' },
      { path: '/documentacion', label: 'Documentación' },
    ],
  },
  {
    key: 'operaciones',
    label: 'Operaciones',
    icon: 'compass',
    children: [
      { path: '/recorridos', label: 'Recorridos' },
      { path: '/combustible', label: 'Combustible' },
      { path: '/incidentes', label: 'Incidentes' },
    ],
  },
  {
    key: 'mantenimientoMenu',
    label: 'Mantenimiento',
    icon: 'wrench',
    children: [
      { path: '/mantenimiento', label: 'Mantenimientos' },
      { path: '/inventario', label: 'Inventario', badge: '5' },
    ],
  },
  { key: 'reportes', label: 'Reportes', icon: 'bar-chart', path: '/reportes' },
  { key: 'tramites', label: 'Trámites', icon: 'clipboard-check', path: '/tramites' },
];

const ADMIN_GROUP: NavEntry = {
  key: 'administracion',
  label: 'Administración',
  icon: 'user-gear',
  children: [
    { path: '/area-transportes', label: 'Área de transportes' },
    { path: '/usuarios', label: 'Usuarios' },
    { path: '/auditoria', label: 'Auditoría' },
  ],
};

/// El rol CONDUCTOR (spec 014) no opera sobre el resto del parque: ve sólo su
/// vehículo a cargo y los dos módulos donde puede registrar algo.
const CONDUCTOR_NAV: readonly NavEntry[] = [
  { key: 'miVehiculo', label: 'Mi vehículo', icon: 'vehicle', path: '/mi-vehiculo' },
  { key: 'recorridos', label: 'Recorridos', icon: 'compass', path: '/recorridos' },
  { key: 'combustible', label: 'Combustible', icon: 'wrench', path: '/combustible' },
];

/// Separación de roles por dominio: TRANSPORTES opera sólo su unidad (nada de
/// refacciones/inventario, ni de la lista general de unidades — eso vive
/// resumido en su propio panel de inicio); ALMACEN y COMBUSTIBLE no se pisan
/// entre sí. Rutas ausentes de esta lista quedan igual para ese rol; los
/// roles no listados (ADMINISTRADOR, MANTENIMIENTO, CONSULTA) ven `BASE_NAV`
/// completo, sin cambios.
const ROLE_EXCLUDED_PATHS: Partial<Record<Role, readonly string[]>> = {
  TRANSPORTES: ['/unidades', '/documentacion', '/mantenimiento', '/inventario'],
  ALMACEN: ['/combustible'],
  COMBUSTIBLE: ['/inventario'],
};

function navForRole(role: Role | null): readonly NavEntry[] {
  const excluded = role ? ROLE_EXCLUDED_PATHS[role] : undefined;
  if (!excluded) return BASE_NAV;
  const excludedSet = new Set(excluded);
  return BASE_NAV.map((entry) =>
    entry.children
      ? { ...entry, children: entry.children.filter((c) => !excludedSet.has(c.path)) }
      : entry,
  ).filter((entry) => !entry.children || entry.children.length > 0);
}

/**
 * Sidebar + topbar del sistema (diseño en `prototipo/`). El menú replica el árbol de 5 secciones
 * de la maqueta: acordeón estricto en los grupos (`toggleGroup`) y auto-apertura + resaltado del
 * grupo de la ruta activa vía `NavigationEnd` — la maqueta define esto último
 * (`abrirGrupoDePaginaActiva`, `prototipo/js/app.js:25032`) pero nunca lo invoca; aquí sí funciona.
 */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ButtonDirective],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly sidebarOpen = signal(false);
  protected readonly openGroup = signal<string | null>(null);
  protected readonly online = signal(navigator.onLine);
  protected readonly pwaInstall = inject(PwaInstallService);

  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /// Usuarios y Auditoría son exclusivos de ADMINISTRADOR (spec 004, RF-14): ningún otro rol
  /// puede consultarlos, así que el grupo "Administración" completo ni aparece para el resto.
  /// CONDUCTOR (spec 014) tiene su propio árbol reducido, no el de operaciones completo.
  /// TRANSPORTES, ALMACEN y COMBUSTIBLE ven `BASE_NAV` con sus rutas ajenas quitadas
  /// (`navForRole`) en vez de acciones ocultas sobre la misma pantalla.
  protected readonly nav = computed<readonly NavEntry[]>(() => {
    const role = this.currentRole.role();
    if (role === 'CONDUCTOR') {
      return CONDUCTOR_NAV;
    }
    const base = navForRole(role);
    return role === 'ADMINISTRADOR' ? [...base, ADMIN_GROUP] : base;
  });

  protected readonly activeGroupKey = computed(() => this.groupKeyForPath(this.currentUrl()));

  protected readonly roleLabel = computed(() => {
    const role = this.currentRole.role();
    return role ? ROLE_LABEL[role] : '';
  });

  protected readonly initials = computed(() => {
    const name = this.authService.currentUser()?.fullName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  });

  constructor(
    protected readonly authService: AuthService,
    protected readonly currentRole: CurrentRoleService,
    protected readonly themeService: ThemeService,
  ) {
    // Al navegar: el grupo de la ruta activa se auto-abre (reemplazando el que estuviera
    // abierto) y el sidebar móvil se cierra — igual que `prototipo/js/app.js:52`.
    effect(() => {
      this.openGroup.set(this.groupKeyForPath(this.currentUrl()));
      this.sidebarOpen.set(false);
    });

    const destroyRef = inject(DestroyRef);
    const onOnline = () => this.online.set(true);
    const onOffline = () => this.online.set(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    destroyRef.onDestroy(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  /** Acordeón estricto: click en el grupo abierto lo cierra; click en otro grupo lo reemplaza. */
  protected toggleGroup(key: string): void {
    this.openGroup.update((current) => (current === key ? null : key));
  }

  protected async installPwa(): Promise<void> {
    await this.pwaInstall.promptInstall();
  }

  protected logout(): void {
    void this.authService.logout();
  }

  private groupKeyForPath(url: string): string | null {
    for (const entry of this.nav()) {
      if (entry.children?.some((child) => child.path === url)) return entry.key;
    }
    return null;
  }
}
