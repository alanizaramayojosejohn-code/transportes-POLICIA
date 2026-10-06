import { Component, booleanAttribute, input } from '@angular/core';

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
  /**
   * Barra de progreso sobre la tabla mientras hay una consulta en vuelo. Es la señal de carga
   * cuando ya hay filas en pantalla (cambio de página o de filtro): ahí `appTableEmpty` no se
   * renderiza, así que su indicador no se vería.
   */
  readonly loading = input(false, { transform: booleanAttribute });
}
