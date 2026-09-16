import { Component, input } from '@angular/core';

/** Celda de datos de una ficha (grid de 2 columnas en `app-drawer`): etiqueta + valor. */
@Component({
  selector: 'app-data-cell',
  template: `
    <div class="rounded-sm border border-edge bg-surface-2 p-3">
      <span class="block text-11 text-ink-faint">{{ label() }}</span>
      <strong class="text-13-5 font-semibold"><ng-content /></strong>
    </div>
  `,
})
export class DataCellComponent {
  readonly label = input.required<string>();
}
