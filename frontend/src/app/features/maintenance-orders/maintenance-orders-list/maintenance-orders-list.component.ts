import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { MaintenanceOrdersService } from '../maintenance-orders.service';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
  MAINTENANCE_TYPES,
  MaintenanceOrder,
  MaintenanceOrderFilter,
  MaintenanceStatus,
  MaintenanceType,
} from '../maintenance-order.model';
import { MaintenanceOrderFormComponent } from '../maintenance-order-form/maintenance-order-form.component';
import { MaintenanceOrderFinishFormComponent } from '../maintenance-order-finish-form/maintenance-order-finish-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { ProcedureTypesService } from '../../procedure-types/procedure-types.service';
import { UpdateProcedureChecklistItemInput } from '../../procedure-types/procedure-type.model';
import { ProcedureChecklistModalComponent } from '../../../shared/procedure-checklist/procedure-checklist-modal.component';

/** Órdenes de mantenimiento (spec 008). */
@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    MaintenanceOrderFormComponent,
    MaintenanceOrderFinishFormComponent,
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

  private readonly filter = computed<MaintenanceOrderFilter>(() => ({
    search: this.search() || undefined,
    type: this.type() || undefined,
    status: this.status() || undefined,
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(
      switchMap((filter) => this.maintenanceOrdersService.list(filter)),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showForm = signal(false);
  protected readonly finishingOrderId = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTimeEs;

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
