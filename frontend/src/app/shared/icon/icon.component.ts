import { Component, computed, input } from '@angular/core';

export type IconName =
  | 'brand-shield'
  | 'login-shield'
  | 'home'
  | 'vehicle'
  | 'compass'
  | 'wrench'
  | 'bar-chart'
  | 'user-gear'
  | 'chevron-down'
  | 'clipboard-check'
  | 'theme-sun'
  | 'theme-moon'
  | 'user-circle'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'arrow-right'
  | 'camera'
  | 'shield-info'
  | 'download'
  | 'close';

const SHIELD_ICONS: ReadonlySet<IconName> = new Set(['brand-shield', 'login-shield']);

/**
 * Icono SVG del sistema, copiado literal de `prototipo/` (sidebar, topbar de login). El
 * prototipo omite los atributos de trazo en el markup y los aplica por CSS global
 * (`stroke: currentColor; stroke-width: 1.8; fill: none` — el chevron usa `stroke-width: 2`);
 * aquí van explícitos en cada `<path>` para no depender de estilos globales ni de `::ng-deep`.
 *
 * Uso: `<app-icon name="home" class="h-4 w-4 text-sidebar-ink-dim" />`. El tamaño y el color se
 * fijan con clases Tailwind en el host (`currentColor` hereda el `color`/`text-*` del elemento).
 */
@Component({
  selector: 'app-icon',
  host: { class: 'inline-block' },
  templateUrl: './icon.component.html',
})
export class IconComponent {
  readonly name = input.required<IconName>();

  protected readonly viewBox = computed(() =>
    SHIELD_ICONS.has(this.name()) ? '0 0 64 64' : '0 0 24 24',
  );
}
