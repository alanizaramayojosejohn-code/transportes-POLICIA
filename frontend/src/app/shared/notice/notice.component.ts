import { Component } from '@angular/core';

/** Aviso informativo (`.notice`/`.toolbar-note`, son alias exactos en la maqueta): franja
 * verde izquierda de 3px. Unifica las 2 variantes divergentes que existían antes del rediseño. */
@Component({
  selector: 'app-notice',
  template: `
    <div
      class="rounded-sm border border-edge border-l-[3px] border-l-green-500 bg-surface-2 px-[14px] py-[11px] text-12-5 leading-relaxed text-ink-muted"
    >
      <ng-content />
    </div>
  `,
})
export class NoticeComponent {}
