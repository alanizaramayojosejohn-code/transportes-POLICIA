import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  /** Título del diálogo, en forma de pregunta: «¿Dar de baja al usuario?». */
  readonly title: string;
  /** Qué registro se toca y qué consecuencia tiene. Admite el nombre del registro. */
  readonly message: string;
  /** Texto del botón que ejecuta la acción; repite el verbo del título («Dar de baja»). */
  readonly confirmLabel: string;
  /**
   * `true` pinta el botón en rojo: la acción retira algo del circuito (baja, borrado).
   * `false` lo deja en verde — reactivar devuelve un registro al uso y no debe leerse
   * como una advertencia sólo porque comparta el diálogo.
   */
  readonly danger: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  readonly resolve: (confirmed: boolean) => void;
}

/**
 * Confirmación de acciones destructivas. Sigue el patrón de `ToastService`: el estado vive aquí y
 * `<app-confirm-host>` (montado una vez en `app.html`) lo renderiza, para que pedir confirmación
 * desde un componente sea una línea —`if (!(await confirm.ask({...}))) return;`— y no un modal
 * declarado y cableado en cada plantilla.
 *
 * Se usa en vez de `window.confirm` porque éste rompe el diseño, bloquea el hilo y la extensión
 * de navegador no puede descartarlo.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(request: ConfirmRequest): Promise<boolean> {
    /// Sólo hay un diálogo a la vez: si llega otro con uno abierto, el anterior se cancela en vez
    /// de quedar con su promesa colgada para siempre.
    this.answer(false);
    return new Promise<boolean>((resolve) => {
      this.pending.set({ ...request, resolve });
    });
  }

  answer(confirmed: boolean): void {
    const pending = this.pending();
    if (!pending) return;
    this.pending.set(null);
    pending.resolve(confirmed);
  }
}
