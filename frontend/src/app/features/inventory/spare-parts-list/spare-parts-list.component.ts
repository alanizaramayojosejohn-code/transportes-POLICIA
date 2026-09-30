import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { InventoryService } from '../inventory.service';
import {
  SPARE_PART_TYPE_LABELS,
  SparePart,
  SparePartCategory,
  SparePartFilter,
  SparePartType,
} from '../spare-part.model';
import { ReportColumn } from '../../../shared/export/report-export';
import { SparePartFormComponent } from '../spare-part-form/spare-part-form.component';
import { StockMovementFormComponent } from '../stock-movement-form/stock-movement-form.component';
import { SparePartDetailComponent } from '../spare-part-detail/spare-part-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { activationConfirm } from '../../../shared/confirm/activation-confirm';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { errorMessage } from '../../../shared/error-message';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ToastService } from '../../../shared/toast/toast.service';

/** Catálogo de repuestos y movimientos de inventario (spec 009). */
@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    SparePartFormComponent,
    StockMovementFormComponent,
    SparePartDetailComponent,
  ],
  selector: 'app-spare-parts-list',
  templateUrl: './spare-parts-list.component.html',
})
export class SparePartsListComponent {
  protected readonly search = signal('');
  protected readonly categoryId = signal('');
  protected readonly type = signal<SparePartType | ''>('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');
  protected readonly types: SparePartType[] = ['LIQUIDO', 'LLANTA', 'PIEZA', 'OTRO'];
  protected readonly typeLabels = SPARE_PART_TYPE_LABELS;

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    categoryId: this.categoryId() || undefined,
    type: this.type() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<SparePartFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(this.query, (filter) => this.inventoryService.list(filter), {
    items: [],
    total: 0,
  });
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly exportColumns: ReportColumn<SparePart>[] = [
    { header: 'Código', accessor: (p) => p.code },
    { header: 'Artículo', accessor: (p) => p.name },
    { header: 'Tipo', accessor: (p) => this.typeLabels[p.type] },
    { header: 'Categoría', accessor: (p) => p.category?.name || '—' },
    { header: 'Unidad', accessor: (p) => p.unit },
    { header: 'Stock', accessor: (p) => p.currentStock },
    { header: 'Mínimo', accessor: (p) => p.minStock },
    {
      header: 'Estado',
      accessor: (p) =>
        !p.isActive
          ? 'Inactivo'
          : this.isLowStock(p.currentStock, p.minStock)
            ? 'Bajo stock'
            : 'Disponible',
    },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.type()) parts.push(`Tipo: ${this.typeLabels[this.type() as SparePartType]}`);
    if (this.isActive())
      parts.push(`Estado: ${this.isActive() === 'true' ? 'Activos' : 'Inactivos'}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => this.inventoryService.listAll(this.filters());

  protected readonly categories: () => SparePartCategory[];

  protected readonly showPartForm = signal(false);
  protected readonly showMovementForm = signal(false);
  protected readonly editingPartId = signal<string | null>(null);

  protected readonly detailPartId = signal<string | null>(null);
  protected readonly detailPart = computed(
    () => this.page().items.find((p) => p.id === this.detailPartId()) ?? null,
  );

  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  constructor(
    private readonly inventoryService: InventoryService,
    protected readonly currentRole: CurrentRoleService,
  ) {
    this.categories = toSignal(this.inventoryService.listCategories(), { initialValue: [] });
  }

  protected closePartForm(): void {
    this.showPartForm.set(false);
    this.editingPartId.set(null);
  }

  protected closeMovementForm(): void {
    this.showMovementForm.set(false);
  }

  protected edit(id: string): void {
    this.editingPartId.set(id);
  }

  protected get editingPart() {
    const id = this.editingPartId();
    return id ? (this.page().items.find((p) => p.id === id) ?? null) : null;
  }

  protected async toggleActive(id: string, isActive: boolean): Promise<void> {
    const part = this.page().items.find((p) => p.id === id);
    if (!part) return;

    const name = `${part.code} — ${part.name}`;
    /// La baja no descuenta stock: el saldo sigue ahí y vuelve a estar disponible al reactivar.
    /// Decirlo evita que alguien dé de baja creyendo que así regulariza un sobrante.
    const stock =
      part.currentStock > 0
        ? `, aunque conserva su saldo de ${part.currentStock} ${part.unit}`
        : '';

    const confirmed = await this.confirm.ask(
      activationConfirm(isActive, {
        subject: 'el repuesto',
        name,
        effect: `dejará de ofrecerse al registrar movimientos de almacén y órdenes de mantenimiento${stock}`,
        restoredEffect:
          'vuelve a ofrecerse al registrar movimientos de almacén y órdenes de mantenimiento',
      }),
    );
    if (!confirmed) return;

    try {
      if (isActive) {
        await this.inventoryService.deactivate(id);
        this.toast.success(`Repuesto ${part.name} dado de baja.`);
      } else {
        await this.inventoryService.reactivate(id);
        this.toast.success(`Repuesto ${part.name} reactivado.`);
      }
    } catch (error) {
      this.toast.error(
        errorMessage(
          error,
          isActive ? 'No se pudo dar de baja el repuesto.' : 'No se pudo reactivar el repuesto.',
        ),
      );
    }
  }

  protected isLowStock(currentStock: number, minStock: number): boolean {
    return currentStock < minStock;
  }
}
