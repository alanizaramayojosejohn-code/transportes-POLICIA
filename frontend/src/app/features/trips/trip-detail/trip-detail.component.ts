import { Component, computed, input, output } from '@angular/core';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { formatDateTimeEs } from '../../../shared/date-format';
import { Trip } from '../trip.model';

/**
 * Ficha del recorrido (spec 006): reproduce `recorridoDetalleModal`
 * (`prototipo/index.html:5417-5516`) — modal angosto, cabecera `RC` con la placa y la insignia
 * abierto/cerrado, grilla de 8 datos y los cuatro bloques de texto libre.
 *
 * Sólo lectura, y recibe el recorrido ya cargado por el listado en vez de volver a consultarlo:
 * el backend no expone `trip(id)`, y la fila del listado ya trae todos los campos que la ficha
 * muestra.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-trip-detail',
  templateUrl: './trip-detail.component.html',
})
export class TripDetailComponent {
  readonly trip = input.required<Trip>();
  readonly closed = output<void>();

  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly subtitle = computed(() => {
    const trip = this.trip();
    return `${trip.destination} · ${this.formatDateTime(trip.departureAt)}`;
  });

  protected readonly driverName = computed(() => {
    const driver = this.trip().driver;
    return `${driver.firstName} ${driver.lastName}`;
  });

  /// El prototipo muestra un único dato «Combustible»; aquí hay dos lecturas (salida y llegada),
  /// así que se componen en una línea en vez de inventar una segunda celda que la maqueta no
  /// tiene. Es un porcentaje del tanque, no litros (`departureFuelLevel`, spec 006).
  protected readonly fuelLevels = computed(() => {
    const trip = this.trip();
    const level = (value: number | null) => (value === null ? '—' : `${value}%`);
    if (trip.returnAt === null) {
      return `Salida ${level(trip.departureFuelLevel)}`;
    }
    return `Salida ${level(trip.departureFuelLevel)} · Llegada ${level(trip.returnFuelLevel)}`;
  });

  /// Igual que el combustible: la maqueta tiene un solo bloque «Estado del vehículo» y el
  /// registro guarda la condición declarada a la salida y a la llegada.
  protected readonly conditionNotes = computed(() => {
    const trip = this.trip();
    const parts: string[] = [];
    if (trip.departureConditionNotes) parts.push(`Salida: ${trip.departureConditionNotes}`);
    if (trip.returnConditionNotes) parts.push(`Llegada: ${trip.returnConditionNotes}`);
    return parts.join('\n');
  });
}
