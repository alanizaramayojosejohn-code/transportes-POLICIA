import { Component, computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PageHeadComponent } from '../../../shared/page-head/page-head.component';
import { CardComponent } from '../../../shared/card/card.component';
import { StatCardComponent } from '../../../shared/stat-card/stat-card.component';
import { TableComponent } from '../../../shared/table/table.component';
import { TableEmptyRowComponent } from '../../../shared/table/table-empty-row.component';
import {
  TableCellDirective,
  TableHeadCellDirective,
  TableHeadRowDirective,
  TableRowDirective,
} from '../../../shared/table/table-parts.directive';
import { InventoryService } from '../../inventory/inventory.service';
import { SparePart, SparePartCategory, SparePartPage } from '../../inventory/spare-part.model';
import { loadableOf } from '../../../shared/loadable';

const LIST_TAKE = 100;

/**
 * Panel de inicio del rol ALMACEN: no está acotado por unidad (spec 015,
 * "Fuera de alcance") — resume el catálogo completo de repuestos. Sin
 * combustible (es dominio de COMBUSTIBLE): el bajo stock se calcula en el
 * cliente sobre los primeros `LIST_TAKE` repuestos activos, mismo criterio
 * que usa el backend para el panel general (`currentStock < minStock`).
 */
@Component({
  imports: [
    PageHeadComponent,
    CardComponent,
    StatCardComponent,
    RouterLink,
    TableComponent,
    TableEmptyRowComponent,
    TableHeadRowDirective,
    TableHeadCellDirective,
    TableRowDirective,
    TableCellDirective,
  ],
  selector: 'app-inventory-dashboard',
  templateUrl: './inventory-dashboard.component.html',
})
export class InventoryDashboardComponent {
  protected readonly spareParts: Signal<SparePartPage>;
  protected readonly loading: Signal<boolean>;
  protected readonly categories: Signal<SparePartCategory[]>;

  protected readonly lowStockItems = computed<SparePart[]>(() =>
    this.spareParts().items.filter((part) => part.currentStock < part.minStock),
  );

  constructor(private readonly inventoryService: InventoryService) {
    const result = loadableOf(this.inventoryService.list({ isActive: true, take: LIST_TAKE }), {
      items: [],
      total: 0,
    });
    this.spareParts = result.value;
    this.loading = result.loading;
    this.categories = toSignal(this.inventoryService.listCategories(), { initialValue: [] });
  }
}
