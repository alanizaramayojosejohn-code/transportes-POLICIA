import { Component, booleanAttribute, input } from '@angular/core';

/**
 * Campo de formulario (`.field`): label + control proyectado. Vive dentro de un grid de 2
 * columnas (`grid grid-cols-1 min-[860px]:grid-cols-2`); `full` lo expande a las 2 columnas.
 * El control interno (`<input>`/`<select>`/`<textarea>`) usa la directiva `appFieldControl`.
 */
@Component({
  selector: 'app-field',
  templateUrl: './field.component.html',
})
export class FieldComponent {
  readonly label = input.required<string>();
  readonly for = input<string>();
  readonly full = input(false, { transform: booleanAttribute });
}
