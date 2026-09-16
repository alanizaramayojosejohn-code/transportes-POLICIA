import { Component, input, output } from '@angular/core';
import { TabItem } from './tab-item';

/** Pestañas rectangulares (`.tabs`/`.tab`) — encabezado de un modal/panel con secciones.
 * Distinto de `app-drawer-tabs` (píldora, sólo dentro del drawer): no son variantes de un mismo
 * componente, la maqueta los trata como dos piezas visuales distintas. */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
})
export class TabsComponent {
  readonly tabs = input.required<readonly TabItem[]>();
  readonly active = input.required<string>();
  readonly activeChange = output<string>();
}
