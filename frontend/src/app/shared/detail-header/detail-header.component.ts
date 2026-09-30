import { Component, input } from '@angular/core';

/**
 * Cabecera de una ficha de detalle: iniciales en círculo, título, subtítulo y un hueco a la
 * derecha para la insignia de estado. Es el `*-detail-head` que repiten todas las fichas del
 * prototipo (conductor, recorrido, combustible, mantenimiento, incidente, inventario, usuario)
 * con el mismo maquetado y sólo dos letras distintas.
 */
@Component({
  selector: 'app-detail-header',
  host: { class: 'mb-5 flex items-center gap-3.5' },
  template: `
    <div
      class="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-full bg-green-700 text-13 font-bold text-white"
      aria-hidden="true"
    >
      {{ initials() }}
    </div>
    <div class="min-w-0 flex-1">
      <h2 class="truncate font-serif text-[19px] font-semibold text-ink">{{ title() }}</h2>
      <p class="text-12-5 text-ink-muted">{{ subtitle() }}</p>
    </div>
    <ng-content />
  `,
})
export class DetailHeaderComponent {
  /** Dos letras que identifican el módulo: `RC` recorrido, `CB` combustible, `MT`… */
  readonly initials = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
