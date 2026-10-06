import { Injectable, signal } from '@angular/core';

/** El navegador no expone este tipo en `lib.dom.d.ts` todavía. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'transportes.pwaInstallDismissed';

/**
 * Captura el evento `beforeinstallprompt` una sola vez, a nivel de aplicación (singleton
 * `providedIn: 'root'`), para que tanto el login (spec de esta mejora) como el shell autenticado
 * compartan el mismo estado sin duplicar listeners de `window`.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly dismissed = signal(sessionStorage.getItem(DISMISSED_KEY) === '1');

  readonly canInstall = signal(false);

  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt.set(event as BeforeInstallPromptEvent);
      this.canInstall.set(!this.dismissed());
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt.set(null);
      this.canInstall.set(false);
    });
  }

  async promptInstall(): Promise<void> {
    const prompt = this.deferredPrompt();
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    this.deferredPrompt.set(null);
    this.canInstall.set(false);
  }

  /** Oculta la sugerencia por el resto de la sesión del navegador (no vuelve a insistir en cada login). */
  dismiss(): void {
    this.dismissed.set(true);
    this.canInstall.set(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  }
}
