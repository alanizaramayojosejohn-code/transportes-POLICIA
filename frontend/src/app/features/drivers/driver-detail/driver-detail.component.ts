import { Component, computed, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { DataCellComponent } from '../../../shared/data-cell/data-cell.component';
import { FormActionsComponent } from '../../../shared/form-actions/form-actions.component';
import { DriversService } from '../drivers.service';
import { formatDateEs } from '../../../shared/date-format';
import { TripsService } from '../../trips/trips.service';

const RELATED_TAKE = 50;

/**
 * Ficha del conductor (spec 005, RF-9): reproduce `conductorDetalleModal`
 * (`prototipo/index.html:4798-4916`) — modal angosto (`.modal-small`, 620px), avatar circular
 * fijo "CD", grilla 2 columnas y sección de vehículos asociados. Sólo lectura: como en el
 * prototipo, editar y dar de baja/reactivar se hacen desde la fila del listado, no desde aquí.
 *
 * "Vehículos asociados" en el prototipo es un dato de mock sin fuente real; el spec 005 lo deja
 * fuera de alcance explícitamente ("depende del historial de asignaciones conductor-vehículo...
 * se resuelve en el spec de Recorridos"). Ese módulo ya existe, así que aquí se deriva de las
 * placas distintas de los recorridos del conductor en vez de dejarlo como texto fijo. Se omite la
 * sección "Observaciones" del prototipo: ese campo no existe en `Driver` (fuera de alcance
 * también, ver spec 005).
 */
@Component({
  imports: [
    ModalComponent,
    BadgeComponent,
    ButtonDirective,
    DataCellComponent,
    FormActionsComponent,
  ],
  selector: 'app-driver-detail',
  templateUrl: './driver-detail.component.html',
})
export class DriverDetailComponent {
  readonly driverId = input.required<string>();
  readonly closed = output<void>();

  protected readonly formatDate = formatDateEs;

  private readonly driverId$ = toObservable(this.driverId);

  protected readonly driver = toSignal(
    this.driverId$.pipe(switchMap((id) => this.driversService.get(id))),
    { initialValue: null },
  );

  protected readonly subtitle = computed(() => {
    const d = this.driver();
    if (!d) return '';
    return `${d.rank || 'Sin grado'} · ${d.unit?.name || 'Sin unidad'}`;
  });

  private readonly trips = toSignal(
    this.driverId$.pipe(
      switchMap((id) => this.tripsService.list({ driverId: id, take: RELATED_TAKE })),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly associatedVehicles = computed(() => {
    const plates = new Set(this.trips().items.map((trip) => trip.vehicle.plate));
    return Array.from(plates).sort();
  });

  constructor(
    private readonly driversService: DriversService,
    private readonly tripsService: TripsService,
  ) {}

  protected isLicenseExpired(licenseExpiresAt: string): boolean {
    return new Date(licenseExpiresAt).getTime() < Date.now();
  }
}
