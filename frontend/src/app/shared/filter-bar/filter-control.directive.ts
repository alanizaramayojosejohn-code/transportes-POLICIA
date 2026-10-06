import { Directive } from '@angular/core';

/** Input/select dentro de `<app-filter-bar>`: estilo de `.filter-row input,select` de la maqueta. */
@Directive({
  selector: 'input[appFilterControl], select[appFilterControl]',
  host: {
    class: 'w-full rounded-sm border border-edge bg-surface-2 px-3 py-[9px] text-13 text-ink',
  },
})
export class FilterControlDirective {}
