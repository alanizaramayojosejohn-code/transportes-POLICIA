import { Component, computed, input, output } from '@angular/core';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { formatDateTimeEs } from '../../../shared/date-format';
import { INCIDENT_TYPE_LABEL, Incident } from '../incident.model';

/**
 * Ficha del incidente (spec 009): reproduce `incidenteDetalleModal`
 * (`prototipo/index.html:8751-8846`) — cabecera `IN`, grilla de 6 datos y los bloques de
 * descripción, daños y observaciones.
 *
 * La insignia de la maqueta era un «estado» del incidente que el spec 009 no modela (un
 * incidente se registra, no cambia de estado); en su lugar muestra el tipo, que sí es lo que
 * clasifica el hecho. El bloque «Observaciones» tampoco tiene campo propio: el registro guarda
 * `description` y `damages`, así que la tercera caja es la referencia policial completa.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-incident-detail',
  templateUrl: './incident-detail.component.html',
})
export class IncidentDetailComponent {
  readonly incident = input.required<Incident>();
  readonly closed = output<void>();

  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly typeLabel = INCIDENT_TYPE_LABEL;

  protected readonly subtitle = computed(() => {
    const incident = this.incident();
    return `${incident.code} · ${this.formatDateTime(incident.occurredAt)}`;
  });

  protected readonly driverName = computed(() => {
    const driver = this.incident().driver;
    return driver ? `${driver.firstName} ${driver.lastName}` : 'Sin conductor registrado';
  });
}
