import { Component, computed, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { FuelRecordsService } from '../fuel-records.service';
import { FUEL_TYPE_LABEL, FUEL_TYPES, FuelRecordFilter, FuelType } from '../fuel-record.model';
import { FuelRecordFormComponent } from '../fuel-record-form/fuel-record-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';

/**
 * Abastecimientos de combustible (spec 007). Un CONDUCTOR (spec 014) sólo ve
 * y carga combustible de su propio vehículo a cargo, igual que en Recorridos.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, FuelRecordFormComponent],
  selector: 'app-fuel-records-list',
  templateUrl: './fuel-records-list.component.html',
})
export class FuelRecordsListComponent {
  protected readonly search = signal('');
  protected readonly fuelType = signal<FuelType | ''>('');
  protected readonly fuelTypes = FUEL_TYPES;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;

  protected readonly isConductor: boolean;
  private readonly myAssignment: Signal<MyVehicleAssignment | null>;

  private readonly filter = computed<FuelRecordFilter>(() => ({
    search: this.search() || undefined,
    fuelType: this.fuelType() || undefined,
    vehicleId: this.isConductor ? this.myAssignment()?.vehicleId : undefined,
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(
      switchMap((filter) =>
        this.isConductor && !filter.vehicleId
          ? of({ items: [], total: 0 })
          : this.fuelRecordsService.list(filter),
      ),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showForm = signal(false);
  protected readonly formatDateTime = formatDateTimeEs;

  constructor(
    private readonly fuelRecordsService: FuelRecordsService,
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
}
