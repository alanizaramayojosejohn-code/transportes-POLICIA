import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { FuelRecordsService } from '../fuel-records.service';
import {
  FUEL_TYPE_LABEL,
  FUEL_TYPES,
  FuelRecord,
  FuelRecordFilter,
  FuelType,
} from '../fuel-record.model';
import { ReportColumn } from '../../../shared/export/report-export';
import { FuelRecordFormComponent } from '../fuel-record-form/fuel-record-form.component';
import { FuelRecordDetailComponent } from '../fuel-record-detail/fuel-record-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ProcedureTypesService } from '../../procedure-types/procedure-types.service';
import { UpdateProcedureChecklistItemInput } from '../../procedure-types/procedure-type.model';
import { ProcedureChecklistModalComponent } from '../../../shared/procedure-checklist/procedure-checklist-modal.component';

/**
 * Abastecimientos de combustible (spec 007). Un CONDUCTOR (spec 014) sólo ve
 * y carga combustible de su propio vehículo a cargo, igual que en Recorridos.
 */
@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    FuelRecordFormComponent,
    FuelRecordDetailComponent,
    RouterLink,
    ProcedureChecklistModalComponent,
  ],
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

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    fuelType: this.fuelType() || undefined,
    vehicleId: this.isConductor ? this.myAssignment()?.vehicleId : undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<FuelRecordFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(
    this.query,
    (filter) =>
      this.isConductor && !filter.vehicleId
        ? of({ items: [], total: 0 })
        : this.fuelRecordsService.list(filter),
    { items: [], total: 0 },
  );
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly exportColumns: ReportColumn<FuelRecord>[] = [
    { header: 'Fecha', accessor: (r) => formatDateTimeEs(r.suppliedAt) },
    { header: 'Vehículo', accessor: (r) => r.vehicle.plate },
    { header: 'KM', accessor: (r) => r.odometer },
    { header: 'Tipo', accessor: (r) => this.fuelTypeLabel[r.fuelType] },
    { header: 'Litros', accessor: (r) => r.quantity },
    { header: 'Costo total', accessor: (r) => `Bs. ${r.totalCost.toFixed(2)}` },
    { header: 'Estación', accessor: (r) => r.station || '—' },
    {
      header: 'Rendimiento',
      accessor: (r) =>
        r.efficiencyKmPerUnit !== null ? `${r.efficiencyKmPerUnit.toFixed(1)} km/l` : '—',
    },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.fuelType()) parts.push(`Tipo: ${this.fuelTypeLabel[this.fuelType() as FuelType]}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => this.fuelRecordsService.listAll(this.filters());

  protected readonly showForm = signal(false);
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly detailRecordId = signal<string | null>(null);
  protected readonly detailRecord = computed(
    () => this.page().items.find((r) => r.id === this.detailRecordId()) ?? null,
  );

  /// Spec 016 RF-15/RF-17: completar el checklist de trámites después del alta.
  protected readonly checklistRecordId = signal<string | null>(null);
  protected readonly checklistItems = computed(
    () =>
      this.page().items.find((r) => r.id === this.checklistRecordId())?.procedureChecklistItems ??
      [],
  );

  constructor(
    private readonly fuelRecordsService: FuelRecordsService,
    private readonly procedureTypesService: ProcedureTypesService,
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

  protected saveChecklist = (items: UpdateProcedureChecklistItemInput[]) => {
    const recordId = this.checklistRecordId();
    if (!recordId) return Promise.resolve([]);
    return this.procedureTypesService.updateFuelRecordChecklist(recordId, items);
  };
}
