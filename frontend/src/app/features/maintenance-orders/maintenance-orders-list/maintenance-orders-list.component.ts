import { Component, computed, linkedSignal, signal } from '@angular/core';
import { MaintenanceOrdersService } from '../maintenance-orders.service';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_STATUS_TONE,
  MAINTENANCE_TYPE_LABEL,
  MAINTENANCE_TYPES,
  MaintenanceOrder,
  MaintenanceOrderFilter,
  MaintenanceStatus,
  MaintenanceType,
} from '../maintenance-order.model';
import { MaintenanceOrderFormComponent } from '../maintenance-order-form/maintenance-order-form.component';
import { MaintenanceOrderFinishFormComponent } from '../maintenance-order-finish-form/maintenance-order-finish-form.component';
import { MaintenanceOrderDetailComponent } from '../maintenance-order-detail/maintenance-order-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ProcedureTypesService } from '../../procedure-types/procedure-types.service';
import { UpdateProcedureChecklistItemInput } from '../../procedure-types/procedure-type.model';
import { ProcedureChecklistModalComponent } from '../../../shared/procedure-checklist/procedure-checklist-modal.component';
import { ReportColumn } from '../../../shared/export/report-export';

/** Órdenes de mantenimiento (spec 008). */
@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    MaintenanceOrderFormComponent,
    MaintenanceOrderFinishFormComponent,
    MaintenanceOrderDetailComponent,
    ProcedureChecklistModalComponent,
  ],
  selector: 'app-maintenance-orders-list',
  templateUrl: './maintenance-orders-list.component.html',
})
export class MaintenanceOrdersListComponent {
  protected readonly search = signal('');
  protected readonly type = signal<MaintenanceType | ''>('');
  protected readonly status = signal<MaintenanceStatus | ''>('');
  protected readonly types = MAINTENANCE_TYPES;
  protected readonly typeLabel = MAINTENANCE_TYPE_LABEL;
  protected readonly statusLabel = MAINTENANCE_STATUS_LABEL;
  protected readonly statusTone = MAINTENANCE_STATUS_TONE;

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    type: this.type() || undefined,
    status: this.status() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<MaintenanceOrderFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(
    this.query,
    (filter) => this.maintenanceOrdersService.list(filter),
    {
      items: [],
      total: 0,
    },
  );
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly exportColumns: ReportColumn<MaintenanceOrder>[] = [
    { header: 'Fecha', accessor: (o) => formatDateTimeEs(o.startedAt) },
    { header: 'Vehículo', accessor: (o) => o.vehicle.plate },
    { header: 'Tipo', accessor: (o) => this.typeLabel[o.type] },
    { header: 'Taller', accessor: (o) => o.workshopName || '—' },
    { header: 'KM ingreso', accessor: (o) => o.odometer },
    {
      header: 'Costo',
      accessor: (o) => (o.status === 'COMPLETED' ? `Bs. ${o.totalCost.toFixed(2)}` : '—'),
    },
    { header: 'Estado', accessor: (o) => this.statusLabel[o.status] },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.type()) parts.push(`Tipo: ${this.typeLabel[this.type() as MaintenanceType]}`);
    if (this.status())
      parts.push(`Estado: ${this.statusLabel[this.status() as MaintenanceStatus]}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () =>
    this.maintenanceOrdersService.listAll(this.filters());

  protected readonly showForm = signal(false);
  protected readonly finishingOrderId = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly detailOrderId = signal<string | null>(null);
  protected readonly detailOrder = computed(
    () => this.page().items.find((o) => o.id === this.detailOrderId()) ?? null,
  );

  /// Spec 016 RF-15/RF-17: completar el checklist de trámites después del alta.
  protected readonly checklistOrderId = signal<string | null>(null);
  protected readonly checklistItems = computed(
    () =>
      this.page().items.find((o) => o.id === this.checklistOrderId())?.procedureChecklistItems ??
      [],
  );

  constructor(
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
    private readonly procedureTypesService: ProcedureTypesService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected closeForm(): void {
    this.showForm.set(false);
  }

  protected openFinish(id: string): void {
    this.finishingOrderId.set(id);
  }

  protected closeFinishForm(): void {
    this.finishingOrderId.set(null);
  }

  protected get finishingOrder(): MaintenanceOrder | null {
    const id = this.finishingOrderId();
    return id ? (this.page().items.find((o) => o.id === id) ?? null) : null;
  }

  protected saveChecklist = (items: UpdateProcedureChecklistItemInput[]) => {
    const orderId = this.checklistOrderId();
    if (!orderId) return Promise.resolve([]);
    return this.procedureTypesService.updateMaintenanceOrderChecklist(orderId, items);
  };
}
