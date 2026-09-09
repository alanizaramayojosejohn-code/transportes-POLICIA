import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentRoleService, ROLE_LABEL, ROLES } from '../../core/current-role.service';
import { ThemeService } from '../../core/theme.service';

/**
 * Sidebar + topbar del sistema (diseño en `docs/../prototype.html`). Sólo
 * enlaza a los módulos con spec implementado (Vehículos, Unidades,
 * Asignaciones); no hay botones de navegación hacia páginas sin spec propio.
 */
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABEL;
  protected readonly sidebarOpen = signal(false);

  protected readonly nav = [
    { path: '/vehiculos', label: 'Vehículos', icon: 'VH' },
    { path: '/unidades', label: 'Unidades', icon: 'UN' },
    { path: '/asignaciones', label: 'Asignaciones', icon: 'AS' },
  ];

  constructor(
    protected readonly currentRole: CurrentRoleService,
    protected readonly themeService: ThemeService,
  ) {}

  protected onRoleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.currentRole.setRole(value as (typeof ROLES)[number]);
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }
}
