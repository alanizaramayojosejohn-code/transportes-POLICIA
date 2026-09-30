import { Component, computed, input, output } from '@angular/core';
import { BadgeTone } from '../../../shared/badge/badge.component';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { formatDateEs } from '../../../shared/date-format';
import { DOCUMENT_TYPE_LABEL, VehicleDocument } from '../vehicle-document.model';

/// Margen con el que un documento pasa a «Por vencer»: un mes es el plazo con el que la unidad
/// alcanza a tramitar una renovación (SOAT, inspección técnica).
const EXPIRING_SOON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ficha del documento vehicular (spec 010): reproduce `documentDetailModal`
 * (`prototipo/index.html:7393-7452`) — grilla de datos más los bloques de referencia y
 * observaciones.
 *
 * La celda «Movimientos» de la maqueta no aplica: un documento no tiene movimientos (era copia
 * de la ficha de inventario). En su lugar va la vigencia restante, que es lo que se consulta de
 * un documento. «Referencia» toma el número del documento, el único identificador que guarda el
 * registro.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-vehicle-document-detail',
  templateUrl: './vehicle-document-detail.component.html',
})
export class VehicleDocumentDetailComponent {
  readonly document = input.required<VehicleDocument>();
  readonly closed = output<void>();

  protected readonly formatDate = formatDateEs;
  protected readonly typeLabel = DOCUMENT_TYPE_LABEL;

  private readonly daysLeft = computed(() =>
    Math.ceil((new Date(this.document().expiresAt).getTime() - Date.now()) / DAY_MS),
  );

  protected readonly statusLabel = computed(() => {
    const days = this.daysLeft();
    if (days < 0) return 'Vencido';
    if (days <= EXPIRING_SOON_DAYS) return 'Por vencer';
    return 'Vigente';
  });

  protected readonly statusTone = computed<BadgeTone>(() => {
    const days = this.daysLeft();
    if (days < 0) return 'red';
    if (days <= EXPIRING_SOON_DAYS) return 'amber';
    return 'green';
  });

  protected readonly validityLabel = computed(() => {
    const days = this.daysLeft();
    if (days < 0) return `Vencido hace ${Math.abs(days)} día(s)`;
    if (days === 0) return 'Vence hoy';
    return `Vence en ${days} día(s)`;
  });

  protected readonly subtitle = computed(() => {
    const doc = this.document();
    return `${this.typeLabel[doc.type]} · ${doc.vehicle.plate}`;
  });
}
