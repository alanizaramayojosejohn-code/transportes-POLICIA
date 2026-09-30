import { Component, DestroyRef, Signal, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CurrentRoleService, ROLE_LABEL, Role } from '../../core/current-role.service';
import { PwaInstallService } from '../../core/pwa-install.service';
import { ThemeService } from '../../core/theme.service';
import { DashboardService } from '../../features/dashboard/dashboard.service';
import { ButtonDirective } from '../../shared/button/button.directive';
import { IconComponent, IconName } from '../../shared/icon/icon.component';

interface NavChild {
  readonly path: string;
  readonly label: string;
  /** Contador vivo (hoy sólo Inventario); lo pone `nav()`, no el árbol estático. */
  readonly badge?: string;
}

const INVENTORY_PATH = '/inventario';
const VEHICLES_PATH = '/vehiculos';

interface NavEntry {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  /** Presente en los ítems simples (Inicio, Reportes); ausente en los grupos. */
  readonly path?: string;
  /** Presente en los grupos colapsables; ausente en los ítems simples. */
  readonly children?: readonly NavChild[];
}

/** Árbol de navegación de la maqueta (`prototipo/index.html:297-442`), sin badges: el de
 * Inventario lo calcula `nav()` a partir del stock real. */
const BASE_NAV: readonly NavEntry[] = [
  { key: 'dashboard', label: 'Inicio', icon: 'home', path: '/' },
  {
    key: 'gestionVehicular',
    label: 'Gestión Vehicular',
    icon: 'vehicle',
    children: [
      { path: VEHICLES_PATH, label: 'Vehículos' },
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
      { path: INVENTORY_PATH, label: 'Inventario' },
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
  TRANSPORTES: ['/unidades', '/documentacion', '/mantenimiento', INVENTORY_PATH],
  ALMACEN: ['/combustible'],
  COMBUSTIBLE: [INVENTORY_PATH],
};

/** `true` si alguna entrada del árbol —simple o hija de un grupo— apunta a `path`. */
function navIncludes(nav: readonly NavEntry[], path: string): boolean {
  return nav.some((entry) => entry.path === path || entry.children?.some((c) => c.path === path));
}

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
  ///
  /// Estructura pura, sin contadores: sólo cambia al cambiar el rol. De aquí salen las
  /// decisiones que no deben rehacerse cada vez que se refresca un badge.
  private readonly baseNav = computed<readonly NavEntry[]>(() => {
    const role = this.currentRole.role();
    if (role === 'CONDUCTOR') {
      return CONDUCTOR_NAV;
    }
    const base = navForRole(role);
    return role === 'ADMINISTRADOR' ? [...base, ADMIN_GROUP] : base;
  });

  /// Artículos por debajo de su mínimo, del mismo `dashboardSummary` que alimenta el panel de
  /// inicio (`currentStock < minStock`) — antes era un "5" fijo heredado de la maqueta. Es un
  /// `watchQuery` vivo durante toda la sesión: las mutaciones de inventario piden refrescar
  /// `DashboardSummary` (ver `InventoryService`) y el badge se actualiza solo.
  /// No se consulta para quien no tiene Inventario en su menú: sería una petición sin lector.
  /// Se asigna en el constructor, no como inicializador de campo: aquí arriba `dashboardService`
  /// (propiedad de parámetro) todavía no está asignada.
  private readonly lowStockCount: Signal<number>;

  /// Sin faltantes no se pinta nada: un «0» permanente sólo enseña a ignorar el badge.
  protected readonly nav = computed<readonly NavEntry[]>(() => {
    const count = this.lowStockCount();
    const base = this.baseNav();
    if (count <= 0) return base;
    return base.map((entry) =>
      entry.children?.some((child) => child.path === INVENTORY_PATH)
        ? {
            ...entry,
            children: entry.children.map((child) =>
              child.path === INVENTORY_PATH ? { ...child, badge: String(count) } : child,
            ),
          }
        : entry,
    );
  });

  protected readonly globalSearch = signal('');

  /// El buscador tiene un único destino (Vehículos), así que se oculta para quien no tiene esa
  /// pantalla — hoy, CONDUCTOR. Mejor ausente que presente y sin efecto.
  protected readonly canSearch = computed(() => navIncludes(this.baseNav(), VEHICLES_PATH));

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
    private readonly dashboardService: DashboardService,
  ) {
    this.lowStockCount = toSignal(
      toObservable(computed(() => navIncludes(this.baseNav(), INVENTORY_PATH))).pipe(
        switchMap((showsInventory) =>
          showsInventory
            ? this.dashboardService.getSummary().pipe(map((s) => s.lowStockCount))
            : of(0),
        ),
      ),
      { initialValue: 0 },
    );

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

  /**
   * Enter en el buscador del topbar lleva a Vehículos con el término ya aplicado, igual que la
   * maqueta (`prototipo/js/app.js:3640`, que saltaba a la página y sembraba su buscador). Viaja
   * como `?buscar=` en vez de estado compartido: así la búsqueda es enlazable y recargar la
   * página no la pierde.
   */
  protected submitSearch(): void {
    const term = this.globalSearch().trim();
    if (!term) return;
    this.globalSearch.set('');
    void this.router.navigate([VEHICLES_PATH], { queryParams: { buscar: term } });
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

  /// Sobre `baseNav`, no sobre `nav`: qué grupo contiene una ruta no depende de los badges, y
  /// leer `nav()` aquí haría que refrescar el contador de stock reabriera el acordeón y cerrara
  /// el sidebar (esto lo consume un `effect`).
  private groupKeyForPath(url: string): string | null {
    for (const entry of this.baseNav()) {
      if (entry.children?.some((child) => child.path === url)) return entry.key;
    }
    return null;
  }
}
