import { Component, Signal, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { CardComponent } from '../../shared/card/card.component';
import { DataCellComponent } from '../../shared/data-cell/data-cell.component';
import { NoticeComponent } from '../../shared/notice/notice.component';
import { ButtonDirective } from '../../shared/button/button.directive';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { FieldComponent } from '../../shared/field/field.component';
import { FieldControlDirective } from '../../shared/field/field-control.directive';
import { TableComponent } from '../../shared/table/table.component';
import { TableEmptyRowComponent } from '../../shared/table/table-empty-row.component';
import {
  TableCellDirective,
  TableHeadCellDirective,
  TableHeadRowDirective,
  TableRowDirective,
} from '../../shared/table/table-parts.directive';
import { ConnectivityService } from '../../core/offline/connectivity.service';
import { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { OdometerReadingsService } from '../odometer-readings/odometer-readings.service';
import { TripsService } from '../trips/trips.service';
import { Trip, TripPage } from '../trips/trip.model';
import { TripFormComponent } from '../trips/trip-form/trip-form.component';
import { TripCloseFormComponent } from '../trips/trip-close-form/trip-close-form.component';
import { TripOutboxNoticeComponent } from '../trips/offline/trip-outbox-notice.component';
import { TripOutboxService } from '../trips/offline/trip-outbox.service';
import { FuelRecordsService } from '../fuel-records/fuel-records.service';
import { FUEL_TYPE_LABEL, FuelRecordPage } from '../fuel-records/fuel-record.model';
import { formatDateTimeEs } from '../../shared/date-format';
import { loadable } from '../../shared/loadable';
import { ToastService } from '../../shared/toast/toast.service';

type Panel = 'none' | 'odometer';

/**
 * «Mi vehículo» (spec 014, RF-15): página de inicio del rol CONDUCTOR.
 *
 * Además del vehículo a cargo y su actividad reciente, es donde el conductor
 * ve y cierra el recorrido que dejó abierto (spec 006, RF-12): registrada una
 * salida, la llegada queda pendiente aquí arriba hasta que se registre. Antes
 * sólo aparecía como una fila «Abierto» en la tabla de los últimos
 * recorridos, y había que ir a `/recorridos` para cerrarla.
 *
 * El kilometraje suelto (RF-16) tampoco tiene pantalla propia, así que se
 * registra aquí mismo. Las cargas de combustible siguen viviendo en
 * `/combustible`, acotadas a este mismo vehículo.
 */
@Component({
  imports: [
    PageHeadComponent,
    CardComponent,
    DataCellComponent,
    NoticeComponent,
    ButtonDirective,
    BadgeComponent,
    FieldComponent,
    FieldControlDirective,
    RouterLink,
    TableComponent,
    TableEmptyRowComponent,
    TableHeadRowDirective,
    TableHeadCellDirective,
    TableRowDirective,
    TableCellDirective,
    TripFormComponent,
    TripCloseFormComponent,
    TripOutboxNoticeComponent,
  ],
  selector: 'app-my-vehicle',
  templateUrl: './my-vehicle.component.html',
})
export class MyVehicleComponent {
  private readonly vehicleDriverAssignmentsService = inject(VehicleDriverAssignmentsService);
  private readonly odometerReadingsService = inject(OdometerReadingsService);
  private readonly tripsService = inject(TripsService);
  private readonly fuelRecordsService = inject(FuelRecordsService);
  private readonly outbox = inject(TripOutboxService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly toast = inject(ToastService);

  /**
   * Fuente de recarga de las consultas: cambia al recuperar la conexión y
   * al vaciarse la cola de envíos, los dos momentos en que lo que hay en
   * pantalla pasó a estar viejo. Hace falta porque una consulta que falló sin
   * red se resuelve con la copia local y ahí se queda: el `watchQuery` ya
   * terminó y no va a volver a emitir solo.
   */
  private readonly reloadKey = computed(
    () => `${this.connectivity.online()}:${this.outbox.flushedAt()}`,
  );

  private readonly assignmentResult = loadable(
    this.reloadKey,
    () => this.vehicleDriverAssignmentsService.myAssignment(),
    null as MyVehicleAssignment | null,
  );
  protected readonly assignment = this.assignmentResult.value;

  private readonly vehicleContext = computed(() => ({
    vehicleId: this.assignment()?.vehicleId ?? null,
    reload: this.reloadKey(),
  }));

  private readonly serverOpenTrip = loadable(
    this.vehicleContext,
    ({ vehicleId }) =>
      vehicleId ? this.tripsService.openTripFor(vehicleId) : of(null as Trip | null),
    null as Trip | null,
  );

  /**
   * Recorrido abierto tal como lo ve el conductor: el que tiene el servidor
   * o, si la salida todavía no se pudo enviar, el que está en cola. Para
   * registrar la llegada da igual cuál de los dos sea.
   */
  protected readonly openTrip = computed<Trip | null>(() => {
    const vehicleId = this.assignment()?.vehicleId;
    if (!vehicleId) return null;
    const queued = this.outbox.queuedOpenTrips().find((trip) => trip.vehicle.id === vehicleId);
    return queued ?? this.serverOpenTrip.value();
  });

  /// Llegada ya registrada sin conexión: para el conductor está hecha, pero
  /// el servidor sigue viendo el recorrido abierto. No se vuelve a pedir.
  protected readonly arrivalQueued = computed(() => {
    const trip = this.openTrip();
    return trip !== null && this.outbox.arrivalFor(trip.id) !== null;
  });

  protected readonly recentTrips: Signal<TripPage>;
  protected readonly recentTripsLoading: Signal<boolean>;
  protected readonly recentFuelRecords: Signal<FuelRecordPage>;
  protected readonly recentFuelRecordsLoading: Signal<boolean>;

  protected readonly panel = signal<Panel>('none');
  protected readonly showDepartureForm = signal(false);
  protected readonly showArrivalForm = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;

  protected readonly odometerValue = signal<number | null>(null);
  protected readonly odometerNotes = signal('');

  constructor() {
    const trips = loadable(
      this.vehicleContext,
      ({ vehicleId }) =>
        vehicleId ? this.tripsService.list({ vehicleId, take: 5 }) : of({ items: [], total: 0 }),
      { items: [], total: 0 },
    );
    this.recentTrips = trips.value;
    this.recentTripsLoading = trips.loading;
    const fuelRecords = loadable(
      this.vehicleContext,
      ({ vehicleId }) =>
        vehicleId
          ? this.fuelRecordsService.list({ vehicleId, take: 5 })
          : of({ items: [], total: 0 }),
      { items: [], total: 0 },
    );
    this.recentFuelRecords = fuelRecords.value;
    this.recentFuelRecordsLoading = fuelRecords.loading;
  }

  protected toggleOdometerPanel(): void {
    this.errorMessage.set(null);
    const opening = this.panel() !== 'odometer';
    this.panel.set(opening ? 'odometer' : 'none');
    if (opening) {
      this.odometerValue.set(this.assignment()?.vehicle.lastOdometer ?? null);
    }
  }

  protected async registerOdometer(): Promise<void> {
    const vehicleId = this.assignment()?.vehicleId;
    if (!vehicleId || this.odometerValue() === null) {
      this.errorMessage.set('Indique el kilometraje actual.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.odometerReadingsService.register({
        vehicleId,
        value: this.odometerValue()!,
        notes: this.odometerNotes() || undefined,
      });
      const registered = this.odometerValue()!;
      this.odometerValue.set(null);
      this.odometerNotes.set('');
      this.panel.set('none');
      this.toast.success(`Kilometraje registrado: ${registered} km.`);
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo completar la operación.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
