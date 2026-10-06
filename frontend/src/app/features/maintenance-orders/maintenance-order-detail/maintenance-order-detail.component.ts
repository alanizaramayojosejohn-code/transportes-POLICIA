import { Component, computed, input, output } from '@angular/core';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { formatDateTimeEs } from '../../../shared/date-format';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_STATUS_TONE,
  MAINTENANCE_TYPE_LABEL,
  MaintenanceOrder,
} from '../maintenance-order.model';

/**
 * Ficha de la orden de mantenimiento (spec 008): reproduce `mantenimientoDetalleModal`
 * (`prototipo/index.html:6422-6500`) — cabecera `MT`, insignia de estado y grilla de datos
 * de ingreso y cierre.
 *
 * Tres celdas de la maqueta no tienen dato detrás: «Diagnóstico», «Próximo KM» y «Próxima
 * fecha» eran campos de su formulario mock y el spec 008 no los modela (la orden guarda un
 * único `description`). En su lugar van el código de orden y el número de factura, que sí
 * existen. Sólo lectura, sobre la orden que ya trae el listado.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-maintenance-order-detail',
  templateUrl: './maintenance-order-detail.component.html',
})
export class MaintenanceOrderDetailComponent {
  readonly order = input.required<MaintenanceOrder>();
  readonly closed = output<void>();

  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly statusLabel = MAINTENANCE_STATUS_LABEL;
  protected readonly statusTone = MAINTENANCE_STATUS_TONE;
  protected readonly typeLabel = MAINTENANCE_TYPE_LABEL;

  protected readonly subtitle = computed(() => {
    const order = this.order();
    return `${order.code} · ${this.typeLabel[order.type]}`;
  });
}
