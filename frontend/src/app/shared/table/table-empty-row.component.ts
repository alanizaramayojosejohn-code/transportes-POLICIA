import { Component, booleanAttribute, input } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

/**
 * Fila de estado vacío para usar en el bloque `@empty` de un `@for` sobre `tbody tr`.
 *
 * Con `loading` puesto muestra el indicador de carga en vez del mensaje: sin eso, cada
 * navegación con `fetchPolicy: 'cache-and-network'` enseña primero «Sin X registrados» y salta
 * a los datos un instante después, que se lee como «no hay nada» cuando sí hay.
 */
@Component({
  imports: [SpinnerComponent],
  selector: 'tr[appTableEmpty]',
  template: `
    <td [attr.colspan]="colspan()" class="px-3 py-8 text-center text-ink-muted">
      @if (loading()) {
        <app-spinner />
      } @else {
        <ng-content />
      }
    </td>
  `,
})
export class TableEmptyRowComponent {
  readonly colspan = input.required<number>();
  readonly loading = input(false, { transform: booleanAttribute });
}
