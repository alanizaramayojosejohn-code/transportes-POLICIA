import { effect, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'transportes.theme';

/** Modo claro/oscuro por atributo `data-theme` en `<html>` (ver styles.css). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly stored =
    typeof localStorage !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY) as Theme | null)
      : null;

  private readonly prefersDark =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

  readonly theme = signal<Theme>(this.stored ?? (this.prefersDark ? 'dark' : 'light'));

  constructor() {
    effect(() => {
      const theme = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, theme);
      }
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }
}
