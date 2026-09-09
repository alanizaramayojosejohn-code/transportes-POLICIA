import { Component, input, output } from '@angular/core';

/** Panel lateral de detalle (fichas): usado por vehículos y unidades. */
@Component({
  selector: 'app-drawer',
  templateUrl: './drawer.component.html',
})
export class DrawerComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly closed = output<void>();
}
