import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { TripsService } from '../trips.service';
import { Trip, TripFilter } from '../trip.model';
import { TripFormComponent } from '../trip-form/trip-form.component';
import { TripCloseFormComponent } from '../trip-close-form/trip-close-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';

/**
 * Registro de salida/llegada de vehículos (spec 006). Un CONDUCTOR (spec
 * 014) sólo ve y registra los recorridos de su propio vehículo a cargo: la
 * lista se acota a `myAssignment().vehicleId`, no al parque completo.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, TripFormComponent, TripCloseFormComponent],
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

  protected readonly page = toSignal(
    toObservable(this.query).pipe(
      switchMap((filter) =>
        this.isConductor && !filter.vehicleId
          ? of({ items: [], total: 0 })
          : this.tripsService.list(filter),
      ),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showForm = signal(false);
  protected readonly closingTripId = signal<string | null>(null);
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
    const id = this.closingTripId();
    return id ? (this.page().items.find((t) => t.id === id) ?? null) : null;
  }
}
