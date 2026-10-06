import { Component, inject } from '@angular/core';
import { ToastService, ToastVariant } from './toast.service';

/** Host único de la pila de toasts — se monta una vez en `app.html`, fuera del `<router-outlet>`. */
@Component({
  selector: 'app-toast-host',
  templateUrl: './toast-host.component.html',
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);

  /// El verde es el `toast()` de la maqueta; el rojo reusa el par `bg-red`/`text-red` del resto
  /// del sistema (badges y botones `danger`) para que un fallo se lea igual en toda la app.
  protected readonly variantClasses: Record<ToastVariant, string> = {
    success: 'bg-green-800 text-white dark:bg-green-400 dark:text-green-900',
    error: 'bg-red text-white',
    info: 'bg-ink text-surface',
  };
}
