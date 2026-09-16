import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Host único de la pila de toasts — se monta una vez en `app.html`, fuera del `<router-outlet>`. */
@Component({
  selector: 'app-toast-host',
  templateUrl: './toast-host.component.html',
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
}
