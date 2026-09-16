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

/** Órdenes de mantenimiento (spec 008). */
@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    MaintenanceOrderFormComponent,
    MaintenanceOrderFinishFormComponent,
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

  constructor(
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
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
}
