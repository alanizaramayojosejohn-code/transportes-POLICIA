import { Component, computed, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { loadable } from '../../../shared/loadable';
import { PersonnelService } from '../../personnel/personnel.service';
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
 * placas distintas de los recorridos del conductor en vez de dejarlo como texto fijo.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS, SpinnerComponent],
  selector: 'app-driver-detail',
  templateUrl: './driver-detail.component.html',
})
export class DriverDetailComponent {
  readonly driverId = input.required<string>();
  readonly closed = output<void>();

  protected readonly formatDate = formatDateEs;

  private readonly driverId$ = toObservable(this.driverId);

  private readonly driverResult = loadable(
    this.driverId,
    (id) => this.personnelService.get(id),
    null,
  );
  protected readonly driver = this.driverResult.value;
  protected readonly loading = this.driverResult.loading;

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
    private readonly personnelService: PersonnelService,
    private readonly tripsService: TripsService,
  ) {}

  protected isLicenseExpired(licenseExpiresAt: string | null): boolean {
    return !!licenseExpiresAt && new Date(licenseExpiresAt).getTime() < Date.now();
  }
}
