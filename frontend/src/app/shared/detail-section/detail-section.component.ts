import { Component, input } from '@angular/core';

/**
 * Bloque de texto libre de una ficha (`*-detail-section` del prototipo): etiqueta pequeña sobre
 * el contenido, en una caja con borde. Para datos de una línea usar `app-data-cell`; esto es
 * para descripciones, daños y observaciones, que pueden venir en varios renglones.
 */
@Component({
  selector: 'app-detail-section',
  host: { class: 'block' },
  template: `
    <div class="rounded-sm border border-edge bg-surface-2 p-3.5">
      <span class="mb-1.5 block text-11 font-semibold text-ink-faint">{{ label() }}</span>
      <p class="whitespace-pre-line text-12-5 leading-relaxed text-ink-muted">
        <ng-content />
      </p>
    </div>
  `,
})
export class DetailSectionComponent {
  readonly label = input.required<string>();
}
