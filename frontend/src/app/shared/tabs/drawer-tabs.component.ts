import { Component, input, output } from '@angular/core';
import { TabItem } from './tab-item';

/** Pestañas en píldora (`.drawer-tab`) — sólo para usar dentro del contenido de `<app-drawer>`. */
@Component({
  selector: 'app-drawer-tabs',
  templateUrl: './drawer-tabs.component.html',
})
export class DrawerTabsComponent {
  readonly tabs = input.required<readonly TabItem[]>();
  readonly active = input.required<string>();
  readonly activeChange = output<string>();
}
