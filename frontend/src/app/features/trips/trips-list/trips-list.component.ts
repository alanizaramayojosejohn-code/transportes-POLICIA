import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { TripsService } from '../trips.service';
import { Trip, TripFilter } from '../trip.model';
import { TripFormComponent } from '../trip-form/trip-form.component';
import { TripCloseFormComponent } from '../trip-close-form/trip-close-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';

/** Registro de salida/llegada de vehículos (spec 006). */
@Component({
  imports: [...LIST_PAGE_IMPORTS, TripFormComponent, TripCloseFormComponent],
  selector: 'app-trips-list',
  templateUrl: './trips-list.component.html',
})
export class TripsListComponent {
  protected readonly search = signal('');
  protected readonly open = signal<'true' | 'false' | ''>('');

  private readonly filter = computed<TripFilter>(() => ({
    search: this.search() || undefined,
    open: this.open() === '' ? undefined : this.open() === 'true',
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(switchMap((filter) => this.tripsService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showForm = signal(false);
  protected readonly closingTripId = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTimeEs;

  constructor(
    private readonly tripsService: TripsService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

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
