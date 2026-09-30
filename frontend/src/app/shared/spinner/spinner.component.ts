import { Component, input } from '@angular/core';

const SIZE_CLASSES = {
  sm: 'h-3.5 w-3.5 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
} as const;

export type SpinnerSize = keyof typeof SIZE_CLASSES;

/**
 * Indicador de carga: anillo girando más una etiqueta de texto. La etiqueta no es decorativa —
 * con `prefers-reduced-motion` el anillo no gira, así que el texto es lo único que distingue
 * «cargando» de «no hay nada». Por eso se muestra siempre (usar `label=""` sólo donde el
 * contexto ya lo diga).
 */
@Component({
  selector: 'app-spinner',
  host: { class: 'inline-flex items-center justify-center gap-2' },
  template: `
    <span
      class="animate-spin rounded-full border-edge border-t-accent motion-reduce:animate-none"
      [class]="sizeClass()"
      aria-hidden="true"
    ></span>
    @if (label()) {
      <span class="text-12-5 text-ink-muted">{{ label() }}</span>
    }
  `,
})
export class SpinnerComponent {
  readonly size = input<SpinnerSize>('md');
  readonly label = input('Cargando…');

  protected readonly sizeClass = () => SIZE_CLASSES[this.size()];
}
