import { Component, input, model } from '@angular/core';
import { FieldComponent } from '../../../shared/field/field.component';
import { FieldControlDirective } from '../../../shared/field/field-control.directive';
import {
  TRIP_CONDITION_CODES,
  TRIP_CONDITION_LABEL,
  TripConditionSelection,
} from '../trip-condition';

/**
 * Estado del vehículo: select de la lista corta (`trip-condition.ts`) y, sólo
 * cuando se elige «Otro», el campo de texto donde se describe.
 *
 * Lo usan las dos pantallas que declaran estado —salida (`TripFormComponent`)
 * y llegada (`TripCloseFormComponent`)—, que deben ofrecer exactamente las
 * mismas opciones; tenerlo una sola vez evita que se separen.
 *
 * El host es `display: contents` a propósito: así los dos `app-field` caen
 * directo en el grid de 2 columnas del formulario que lo contiene, en vez de
 * quedar apilados dentro de una celda.
 */
@Component({
  imports: [FieldComponent, FieldControlDirective],
  selector: 'app-trip-condition-field',
  templateUrl: './trip-condition-field.component.html',
  host: { class: 'contents' },
})
export class TripConditionFieldComponent {
  readonly label = input.required<string>();
  /** Mensaje de validación del detalle de «Otro» (`requiredIf`). */
  readonly otherErrorText = input<string | null>(null);

  readonly code = model.required<TripConditionSelection>();
  readonly otherText = model.required<string>();

  protected readonly codes = TRIP_CONDITION_CODES;
  protected readonly codeLabel = TRIP_CONDITION_LABEL;

  protected onCodeChange(value: string): void {
    this.code.set(value as TripConditionSelection);
    /// Volver a un estado de la lista descarta la descripción de «Otro»:
    /// dejarla ahí la guardaría escondida detrás del nuevo estado elegido.
    if (value !== 'OTRO') {
      this.otherText.set('');
    }
  }
}
