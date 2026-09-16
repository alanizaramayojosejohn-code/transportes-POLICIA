import { Component, input } from '@angular/core';

/** Fila de estado vacío para usar en el bloque `@empty` de un `@for` sobre `tbody tr`. */
@Component({
  selector: 'tr[appTableEmpty]',
  template: `
    <td [attr.colspan]="colspan()" class="px-3 py-8 text-center text-ink-muted">
      <ng-content />
    </td>
  `,
})
export class TableEmptyRowComponent {
  readonly colspan = input.required<number>();
}
