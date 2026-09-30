import { Injectable, signal } from '@angular/core';
import { errorMessage } from '../error-message';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly leaving: boolean;
}

/// Un error necesita más tiempo de lectura que un «guardado» —y no siempre se está mirando la
/// esquina cuando aparece—, así que dura más del doble y además se puede descartar a mano.
const VISIBLE_MS: Record<ToastVariant, number> = { success: 2600, error: 6000, info: 2600 };
const FADE_MS = 250;

/**
 * Pila de notificaciones efímeras (`toast()` de la maqueta). `<app-toast-host>` (montado una sola
 * vez en `app.html`) lee `toasts()` y renderiza la pila.
 *
 * Toda mutación del sistema termina en uno de estos: `success()` al confirmar lo que se hizo,
 * `error()` cuando falla. En los formularios el error sigue además inline junto al campo — el
 * toast lo acompaña, no lo reemplaza, porque el modal puede quedar tapando la esquina.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<readonly Toast[]>([]);

  /** Acción completada: verde, breve, no descartable (se va sola antes de estorbar). */
  success(message: string): void {
    this.push(message, 'success');
  }

  /** Mutación fallida: rojo, 6s y con botón de cerrar. */
  error(message: string): void {
    this.push(message, 'error');
  }

  /** Aviso neutro que no confirma ni reporta un fallo (p. ej. una acción no disponible todavía). */
  info(message: string): void {
    this.push(message, 'info');
  }

  /**
   * Publica el fallo de una mutación y devuelve el mensaje ya resuelto, para dejarlo además
   * inline donde corresponda: `this.errorMessage.set(this.toast.reportError(e, '…'))`.
   * Los dos sitios hacen falta — dentro de un modal el toast queda tapado, y el aviso inline
   * queda fuera de vista si el formulario está desplazado.
   */
  reportError(error: unknown, fallback: string): string {
    const message = errorMessage(error, fallback);
    this.error(message);
    return message;
  }

  /** Sólo los toasts de error se pueden cerrar a mano; el resto se va antes de que estorbe. */
  dismissible(toast: Toast): boolean {
    return toast.variant === 'error';
  }

  dismiss(id: number): void {
    this.startLeave(id);
  }

  private push(message: string, variant: ToastVariant): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, variant, leaving: false }]);
    setTimeout(() => this.startLeave(id), VISIBLE_MS[variant]);
  }

  private startLeave(id: number): void {
    /// El temporizador puede llegar después de un cierre manual: no revivir un toast ya retirado.
    if (!this.toasts().some((toast) => toast.id === id && !toast.leaving)) return;
    this.toasts.update((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => this.remove(id), FADE_MS);
  }

  private remove(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
