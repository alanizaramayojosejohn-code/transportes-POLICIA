import { Component, input, output } from '@angular/core';
import { TabItem } from './tab-item';

/** Pestañas rectangulares (`.tabs`/`.tab`) — encabezado de un `app-modal` con secciones. */
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
})
export class TabsComponent {
  readonly tabs = input.required<readonly TabItem[]>();
  readonly active = input.required<string>();
  readonly activeChange = output<string>();
}
