import { Component, computed, input, output } from '@angular/core';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { ReportCard } from '../report-card';

/**
 * Ficha del reporte (spec 018): equivalente de `reporteDetalleModal`
 * (`prototipo/index.html:9311-9360`).
 *
 * La maqueta generaba el reporte *dentro* del modal (resumen + tabla + Imprimir/Exportar PDF)
 * porque no tenía pantallas reales detrás. Aquí cada reporte ya es una pantalla con sus propios
 * filtros, paginación y botones de exportación, así que duplicar la tabla en un modal daría dos
 * lugares donde leer lo mismo y sólo uno con filtros. La ficha conserva lo que sí aporta antes
 * de abrirlo: de qué se compone el reporte, sobre qué datos corre, quién lo ve y con qué
 * salidas — y de ahí se abre la pantalla.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-report-detail',
  templateUrl: './report-detail.component.html',
})
export class ReportDetailComponent {
  readonly card = input.required<ReportCard>();
  readonly closed = output<void>();
  /** Abre la pantalla del reporte; la navegación la resuelve el menú, que ya tiene el router. */
  readonly opened = output<ReportCard>();

  protected readonly rolesLabel = computed(() => this.card().roles.join(' · '));
}
