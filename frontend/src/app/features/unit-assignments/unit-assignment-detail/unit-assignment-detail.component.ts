import { Component, computed, input, output } from '@angular/core';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { formatDateEs } from '../../../shared/date-format';
import { UnitAssignment } from '../unit-assignment.model';

/**
 * Ficha de la asignación vehículo–unidad (spec 003): reproduce `asignacionDetalleModal`
 * (`prototipo/index.html:7911-7963`) — grilla de 6 datos más los bloques de motivo y
 * observaciones. Sólo lectura: editar y cerrar la asignación se hacen desde la fila del
 * listado, donde ya viven sus dos paneles en línea.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-unit-assignment-detail',
  templateUrl: './unit-assignment-detail.component.html',
})
export class UnitAssignmentDetailComponent {
  readonly assignment = input.required<UnitAssignment>();
  readonly closed = output<void>();

  protected readonly formatDate = formatDateEs;

  protected readonly isCurrent = computed(() => this.assignment().endDate === null);

  protected readonly subtitle = computed(() => {
    const assignment = this.assignment();
    const start = this.formatDate(assignment.startDate);
    const end = assignment.endDate ? this.formatDate(assignment.endDate) : 'vigente';
    return `${start} — ${end}`;
  });
}
