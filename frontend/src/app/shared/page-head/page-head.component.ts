import { Component, input } from '@angular/core';

/**
 * Encabezado de pantalla: título + descripción a la izquierda, acciones (slot por defecto) a la
 * derecha. En ≤560px las acciones se estiran a ancho completo (`.page-head` de la maqueta).
 */
@Component({
  selector: 'app-page-head',
  templateUrl: './page-head.component.html',
})
export class PageHeadComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
