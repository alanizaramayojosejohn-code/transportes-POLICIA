import { Component, input } from '@angular/core';

/**
 * Envoltorio de `<table>` con scroll horizontal y pie de total opcional. El `<thead>`/`<tbody>`
 * se proyectan tal cual — usa las directivas `appTableHeadRow`/`appTableHeadCell`/`appTableRow`/
 * `appTableCell` (`table-parts.directive.ts`) en sus filas/celdas para el estilo estándar.
 */
@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
})
export class TableComponent {
  /** Texto ya compuesto, p. ej. `"12 vehículo(s) en total."` — se omite si no se pasa. */
  readonly footer = input<string>();
}
