import { Component, input } from '@angular/core';

/** Tarjeta KPI (`.metric`): icono con iniciales, valor en serif 24px, etiqueta 12px. */
@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  /** Iniciales cortas del icono (`V`, `✓`, `C`, `KM`...) — la maqueta no usa SVG aquí. */
  readonly icon = input.required<string>();
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
}
