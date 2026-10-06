import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'outline' | 'primary' | 'soft' | 'danger';
export type ButtonSize = 'md' | 'sm';

const BASE_SHADOW = 'shadow-[0_1px_1px_rgba(8,20,15,.03)]';

/** `.btn` base + variantes de la maqueta. Las 5 variantes de dominio del prototipo (`reassign`,
 * `activate`, `unit-manager`, `restore`, `recorrido-close`) son idénticas byte a byte a `soft`;
 * (`deactivate`, `invalidate`) son idénticas a `danger` — de ahí que sólo haya 4 variantes aquí. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  outline: `border border-edge-strong bg-surface text-ink ${BASE_SHADOW} hover:border-green-500 hover:text-green-700 dark:hover:text-green-300`,
  primary:
    'border border-green-700 bg-green-700 text-white shadow-[0_8px_18px_-13px_rgba(20,80,61,.65)] hover:border-green-800 hover:bg-green-800 dark:border-green-400 dark:bg-green-400 dark:text-green-900 dark:hover:border-green-300 dark:hover:bg-green-300',
  soft: `border border-transparent bg-green-bg text-green-700 ${BASE_SHADOW} hover:border-green-700 hover:bg-green-700 hover:text-white dark:text-green-300`,
  danger: `border border-transparent bg-red-bg text-red ${BASE_SHADOW} hover:border-red hover:bg-red hover:text-white`,
};

/** Tamaño de tabla (`.vehicle-actions .btn` y equivalentes): mismo `min-height`, menos padding. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-[38px] px-4 py-[9px] text-13',
  sm: 'min-h-[38px] px-[9px] py-1.5 text-11-5',
};

/**
 * Decora un `<button>` nativo con el estilo del sistema — se aplica como atributo para conservar
 * el elemento nativo (`type="submit"`, `disabled`, etc.) en vez de envolverlo en otro componente.
 * Uso: `<button appButton variant="primary">Guardar</button>`.
 *
 * Nota: el `.btn` de la maqueta NO transiciona `color` (sólo `border-color`/`background`/
 * `transform`) — el cambio de color en hover es instantáneo, tal cual el original.
 */
@Directive({
  selector: 'button[appButton]',
  host: {
    class:
      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-semibold transition-[border-color,background,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0',
    '[class]': 'stateClasses()',
  },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('outline');
  readonly size = input<ButtonSize>('md');

  protected readonly stateClasses = computed(
    () => `${VARIANT_CLASSES[this.variant()]} ${SIZE_CLASSES[this.size()]}`,
  );
}
