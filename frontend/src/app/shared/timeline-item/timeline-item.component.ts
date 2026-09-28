import { Component } from '@angular/core';

/** Fila de un historial dentro de una ficha (`app-modal`): condición, asignación, etc. */
@Component({
  selector: 'app-timeline-item',
  host: { class: 'block' },
  template: `<div class="rounded-sm border border-edge bg-surface-2 p-3 text-12-5">
    <ng-content />
  </div>`,
})
export class TimelineItemComponent {}
