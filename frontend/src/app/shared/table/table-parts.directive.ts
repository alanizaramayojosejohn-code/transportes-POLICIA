import { Directive } from '@angular/core';

/** Fila de `<thead>`: `thead th` de la maqueta (11px/600, versalitas, `--text-faint`). */
@Directive({
  selector: 'tr[appTableHeadRow]',
  host: {
    class:
      'border-b border-edge text-left text-11 font-semibold uppercase tracking-[.025em] text-ink-faint',
  },
})
export class TableHeadRowDirective {}

/** Celda de `<thead>`: padding `0 12px 10px` de la maqueta. */
@Directive({
  selector: 'th[appTableHeadCell]',
  host: { class: 'px-3 pb-2.5 text-left font-semibold' },
})
export class TableHeadCellDirective {}

/** Fila de `<tbody>`: separador horizontal + hover, sin zebra striping ni bordes verticales. */
@Directive({
  selector: 'tr[appTableRow]',
  host: { class: 'border-b border-edge transition-colors last:border-b-0 hover:bg-surface-2' },
})
export class TableRowDirective {}

/** Celda de `<tbody>`: padding uniforme de 12px. */
@Directive({
  selector: 'td[appTableCell]',
  host: { class: 'px-3 py-3' },
})
export class TableCellDirective {}
