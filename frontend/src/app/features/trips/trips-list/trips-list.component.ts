import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { TripsService } from '../trips.service';
import { Trip, TripFilter } from '../trip.model';
import { TripFormComponent } from '../trip-form/trip-form.component';
import { TripCloseFormComponent } from '../trip-close-form/trip-close-form.component';
import { TripDetailComponent } from '../trip-detail/trip-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ReportColumn } from '../../../shared/export/report-export';

/**
 * Registro de salida/llegada de vehículos (spec 006). Un CONDUCTOR (spec
 * 014) sólo ve y registra los recorridos de su propio vehículo a cargo: la
 * lista se acota a `myAssignment().vehicleId`, no al parque completo.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, TripFormComponent, TripCloseFormComponent, TripDetailComponent],
  selector: 'app-trips-list',
  templateUrl: './trips-list.component.html',
})
export class TripsListComponent {
  protected readonly search = signal('');
  protected readonly open = signal<'true' | 'false' | ''>('');

  protected readonly isConductor: boolean;
  private readonly myAssignment: Signal<MyVehicleAssignment | null>;

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    open: this.open() === '' ? undefined : this.open() === 'true',
    vehicleId: this.isConductor ? this.myAssignment()?.vehicleId : undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<TripFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(
    this.query,
    (filter) =>
      this.isConductor && !filter.vehicleId
        ? of({ items: [], total: 0 })
        : this.tripsService.list(filter),
    { items: [], total: 0 },
  );
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly exportColumns: ReportColumn<Trip>[] = [
    { header: 'Vehículo', accessor: (t) => t.vehicle.plate },
    { header: 'Conductor', accessor: (t) => `${t.driver.firstName} ${t.driver.lastName}` },
    { header: 'Destino', accessor: (t) => t.destination },
    { header: 'Salida', accessor: (t) => formatDateTimeEs(t.departureAt) },
    { header: 'Llegada', accessor: (t) => formatDateTimeEs(t.returnAt) },
    { header: 'KM', accessor: (t) => t.distanceKm ?? '—' },
    { header: 'Estado', accessor: (t) => (t.returnAt ? 'Cerrado' : 'Abierto') },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.open()) parts.push(`Estado: ${this.open() === 'true' ? 'Abiertos' : 'Cerrados'}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => this.tripsService.listAll(this.filters());

  protected readonly showForm = signal(false);
  protected readonly closingTripId = signal<string | null>(null);
  protected readonly detailTripId = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTimeEs;

  constructor(
    private readonly tripsService: TripsService,
    protected readonly currentRole: CurrentRoleService,
    vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
  ) {
    this.isConductor = currentRole.role() === 'CONDUCTOR';
    this.myAssignment = toSignal(vehicleDriverAssignmentsService.myAssignment(), {
      initialValue: null,
    });
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  protected openClose(id: string): void {
    this.closingTripId.set(id);
  }

  protected closeCloseForm(): void {
    this.closingTripId.set(null);
  }

  protected get closingTrip(): Trip | null {
    return this.findTrip(this.closingTripId());
  }

  protected get detailTrip(): Trip | null {
    return this.findTrip(this.detailTripId());
  }

  private findTrip(id: string | null): Trip | null {
    return id ? (this.page().items.find((t) => t.id === id) ?? null) : null;
  }
}
