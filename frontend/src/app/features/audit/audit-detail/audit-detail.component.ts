import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { DataCellComponent } from '../../../shared/data-cell/data-cell.component';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { FormActionsComponent } from '../../../shared/form-actions/form-actions.component';
import { formatDateTimeEs } from '../../../shared/date-format';
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ACTION_TONE,
  AUDIT_MODULE_LABEL,
  AuditLogEntry,
} from '../audit.model';

/**
 * Ficha de un evento de auditoría (spec 019, RF-19). Reproduce el
 * `auditoriaDetalleModal` de la maqueta, con el payload registrado en el bloque
 * «Detalle del evento». Sólo lectura, como todo el módulo.
 */
@Component({
  imports: [
    ModalComponent,
    DataCellComponent,
    BadgeComponent,
    ButtonDirective,
    FormActionsComponent,
  ],
  selector: 'app-audit-detail',
  templateUrl: './audit-detail.component.html',
})
export class AuditDetailComponent {
  readonly entry = input.required<AuditLogEntry>();
  readonly closed = output<void>();

  protected readonly actionLabel = AUDIT_ACTION_LABEL;
  protected readonly actionTone = AUDIT_ACTION_TONE;
  protected readonly moduleLabel = AUDIT_MODULE_LABEL;
  protected readonly formatDateTime = formatDateTimeEs;
}
