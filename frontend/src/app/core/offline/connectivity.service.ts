import { Injectable, signal } from '@angular/core';

/**
 * Estado de conexión del navegador, como señal única de la aplicación.
 *
 * Antes vivía duplicado dentro de `ShellComponent` (sólo para pintar el
 * indicador del topbar). Ahora también lo consume la cola de envíos
 * pendientes (`TripOutboxService`), que necesita exactamente la misma
 * lectura: un `signal` con el estado actual y los eventos `online`/`offline`
 * de `window` ya enganchados. Al ser `providedIn: 'root'` los listeners se
 * registran una sola vez por sesión y nunca se quitan — el servicio vive
 * tanto como la pestaña.
 *
 * `navigator.onLine` es optimista por diseño: `true` significa «hay una
 * interfaz de red», no «el servidor responde». Por eso las mutaciones
 * también encolan cuando fallan por error de red estando «en línea»
 * (`TripsService.create`/`close`).
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly state = signal(this.readInitial());

  readonly online = this.state.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.state.set(true));
    window.addEventListener('offline', () => this.state.set(false));
  }

  private readInitial(): boolean {
    /// `navigator` no existe al renderizar en servidor ni en algunos entornos de test.
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }
}
