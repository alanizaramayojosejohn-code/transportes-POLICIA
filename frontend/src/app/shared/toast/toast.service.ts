import { Injectable, signal } from '@angular/core';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly leaving: boolean;
}

const VISIBLE_MS = 2600;
const FADE_MS = 250;

/**
 * Pila de notificaciones efímeras (`toast()` de la maqueta): visibles 2600ms + 250ms de fundido.
 * `<app-toast-host>` (montado una sola vez en `app.html`) lee `toasts()` y renderiza la pila.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<readonly Toast[]>([]);

  show(message: string): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, leaving: false }]);
    setTimeout(() => this.startLeave(id), VISIBLE_MS);
  }

  private startLeave(id: number): void {
    this.toasts.update((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => this.remove(id), FADE_MS);
  }

  private remove(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
