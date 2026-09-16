import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { InventoryService } from '../inventory.service';
import { SparePartCategory, SparePartFilter } from '../spare-part.model';
import { SparePartFormComponent } from '../spare-part-form/spare-part-form.component';
import { StockMovementFormComponent } from '../stock-movement-form/stock-movement-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';

/** Catálogo de repuestos y movimientos de inventario (spec 009). */
@Component({
  imports: [...LIST_PAGE_IMPORTS, SparePartFormComponent, StockMovementFormComponent],
  selector: 'app-spare-parts-list',
  templateUrl: './spare-parts-list.component.html',
})
export class SparePartsListComponent {
  protected readonly search = signal('');
  protected readonly categoryId = signal('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');

  private readonly filter = computed<SparePartFilter>(() => ({
    search: this.search() || undefined,
    categoryId: this.categoryId() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(switchMap((filter) => this.inventoryService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly categories: () => SparePartCategory[];

  protected readonly showPartForm = signal(false);
  protected readonly showMovementForm = signal(false);
  protected readonly editingPartId = signal<string | null>(null);

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
    if (isActive) {
      await this.inventoryService.deactivate(id);
    } else {
      await this.inventoryService.reactivate(id);
    }
  }

  protected isLowStock(currentStock: number, minStock: number): boolean {
    return currentStock < minStock;
  }
}
