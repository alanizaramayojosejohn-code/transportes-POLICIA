import { Directive, ElementRef, booleanAttribute, inject, input } from '@angular/core';

/**
 * Input/select/textarea dentro de `<app-field>`: estilo de `.field input,select,textarea` de la
 * maqueta. El foco sólo cambia `border-color` (sin ring); deshabilitado/sólo-lectura atenúan.
 * `invalid` (típicamente `!!validation.error('campo')`) pinta el borde en rojo — el mensaje en sí
 * lo muestra `app-field` vía `errorText`, no esta directiva.
 */
@Directive({
  selector: 'input[appFieldControl], select[appFieldControl], textarea[appFieldControl]',
  host: {
    class:
      'w-full rounded-sm border bg-surface-2 px-[11px] py-[9px] text-13-5 text-ink outline-none transition-colors focus:border-green-500 read-only:cursor-not-allowed read-only:bg-surface-3 read-only:text-ink-muted read-only:opacity-70 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:opacity-70',
    '[class.min-h-16]': 'isTextarea',
    '[class.resize-y]': 'isTextarea',
    '[class.border-edge]': '!invalid()',
    '[class.border-red]': 'invalid()',
  },
})
export class FieldControlDirective {
  readonly invalid = input(false, { transform: booleanAttribute });
  protected readonly isTextarea = inject(ElementRef).nativeElement.tagName === 'TEXTAREA';
}
