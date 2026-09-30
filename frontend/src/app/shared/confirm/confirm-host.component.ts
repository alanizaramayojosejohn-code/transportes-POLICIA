import { Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';
import { ButtonDirective } from '../button/button.directive';
import { FormActionsComponent } from '../form-actions/form-actions.component';
import { ModalComponent } from '../modal/modal.component';

/**
 * Host único del diálogo de confirmación — se monta una vez en `app.html`, fuera del
 * `<router-outlet>`, igual que `<app-toast-host>`. Escape y clic en el fondo cancelan
 * (los da `<app-modal>`), que es lo que corresponde a un diálogo de confirmación.
 */
@Component({
  imports: [ModalComponent, FormActionsComponent, ButtonDirective],
  selector: 'app-confirm-host',
  templateUrl: './confirm-host.component.html',
})
export class ConfirmHostComponent {
  protected readonly confirmService = inject(ConfirmService);
}
