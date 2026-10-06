import { Component, computed, inject } from '@angular/core';
import { ConnectivityService } from '../../../core/offline/connectivity.service';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { formatDateTimeEs } from '../../../shared/date-format';
import { TripOutboxEntry, TripOutboxService } from './trip-outbox.service';

/**
 * Lo que está registrado en el equipo pero todavía no en el servidor
 * (spec 006, RF-16).
 *
 * Que exista es la mitad del valor de la cola: un conductor que registró una
 * salida sin señal tiene que poder comprobar que no se perdió, y enterarse si
 * el servidor terminó rechazándola. Sin esto, «guardado sin conexión» sería
 * un toast que se va en dos segundos y nada más.
 *
 * No muestra nada cuando la cola está vacía, así que puede quedar montado en
 * cualquier pantalla sin ocupar lugar.
 */
@Component({
  imports: [ButtonDirective],
  selector: 'app-trip-outbox-notice',
  templateUrl: './trip-outbox-notice.component.html',
})
export class TripOutboxNoticeComponent {
  private readonly confirm = inject(ConfirmService);
  protected readonly outbox = inject(TripOutboxService);
  protected readonly online = inject(ConnectivityService).online;

  protected readonly pending = this.outbox.pending;
  protected readonly failed = this.outbox.failed;
  protected readonly hasEntries = computed(() => this.outbox.entries().length > 0);
  protected readonly formatDateTime = formatDateTimeEs;

  protected describe(entry: TripOutboxEntry): string {
    return this.outbox.describe(entry);
  }

  protected async discard(entry: TripOutboxEntry): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Descartar el registro pendiente?',
      message: `${this.outbox.describe(entry)} no se enviará y se perderá lo registrado. Si todavía corresponde, habrá que volver a registrarlo.`,
      confirmLabel: 'Descartar',
      danger: true,
    });
    if (confirmed) {
      this.outbox.discard(entry.id);
    }
  }
}
