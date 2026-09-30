import { Component, computed, input, output } from '@angular/core';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { formatDateTimeEs } from '../../../shared/date-format';
import { FUEL_TYPE_LABEL, FuelRecord } from '../fuel-record.model';

/**
 * Ficha del abastecimiento (spec 007): reproduce `combustibleDetalleModal`
 * (`prototipo/index.html:5934-6019`) — cabecera `CB`, grilla de 8 datos y los bloques de
 * estación, documentación y observaciones.
 *
 * Añade dos cosas que la maqueta no tenía porque no existían en ella: el rendimiento calculado
 * (`efficiencyKmPerUnit`, spec 007 RF-8, ya visible en el listado) y el checklist de trámites
 * del registro (spec 016 RF-17). Sólo lectura, sobre el registro que ya trae el listado.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-fuel-record-detail',
  templateUrl: './fuel-record-detail.component.html',
})
export class FuelRecordDetailComponent {
  readonly record = input.required<FuelRecord>();
  readonly closed = output<void>();

  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;

  protected readonly subtitle = computed(() => {
    const record = this.record();
    return `${this.fuelTypeLabel[record.fuelType]} · ${this.formatDateTime(record.suppliedAt)}`;
  });

  protected readonly driverName = computed(() => {
    const driver = this.record().driver;
    return driver ? `${driver.firstName} ${driver.lastName}` : 'Sin conductor registrado';
  });

  /// La maqueta tiene un bloque «Documentación» suelto; el registro guarda un único número de
  /// vale o factura (`ticketNumber`, spec 007), así que es lo que se muestra ahí.
  protected readonly documentLabel = computed(
    () => this.record().ticketNumber || 'Sin vale ni factura registrados.',
  );
}
