import { Component } from '@angular/core';

/**
 * Fila de filtros (`.filter-row`): el primer control (el buscador) ocupa el doble de espacio que
 * el resto. Los controles usan la directiva `appFilterControl` para el estilo estándar.
 */
@Component({
  selector: 'app-filter-bar',
  template: `
    <div
      class="mb-4 flex flex-wrap gap-2.5 [&>*]:min-w-[170px] [&>*]:flex-1 [&>:first-child]:flex-[2]"
    >
      <ng-content />
    </div>
  `,
})
export class FilterBarComponent {}
