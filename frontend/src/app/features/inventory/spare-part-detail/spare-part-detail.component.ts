import { Component, computed, input, output } from '@angular/core';
import { BadgeTone } from '../../../shared/badge/badge.component';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { TableComponent } from '../../../shared/table/table.component';
import { TableEmptyRowComponent } from '../../../shared/table/table-empty-row.component';
import {
  TableCellDirective,
  TableHeadCellDirective,
  TableHeadRowDirective,
  TableRowDirective,
} from '../../../shared/table/table-parts.directive';
import { formatDateTimeEs } from '../../../shared/date-format';
import { loadable } from '../../../shared/loadable';
import { InventoryService } from '../inventory.service';
import {
  SPARE_PART_TYPE_LABELS,
  STOCK_MOVEMENT_TYPE_LABEL,
  SparePart,
  StockMovement,
} from '../spare-part.model';

/// Cuántos movimientos trae el «Historial reciente» de la ficha. La maqueta muestra una tabla
/// corta, no el kardex completo — para eso está el reporte de Movimientos de almacén.
const HISTORY_TAKE = 10;

/**
 * Ficha del artículo de almacén (spec 017): reproduce `inventarioDetalleModal`
 * (`prototipo/index.html:7033-7148`) — cabecera `IN`, insignia de stock, grilla de 6 datos,
 * observaciones e historial reciente de movimientos.
 *
 * Es la única ficha que consulta por su cuenta: el contador de movimientos y la tabla del
 * historial no están en la fila del listado, así que pide `stockMovements` acotado al artículo.
 */
@Component({
  imports: [
    ...DETAIL_MODAL_IMPORTS,
    TableComponent,
    TableEmptyRowComponent,
    TableHeadRowDirective,
    TableHeadCellDirective,
    TableRowDirective,
    TableCellDirective,
  ],
  selector: 'app-spare-part-detail',
  templateUrl: './spare-part-detail.component.html',
})
export class SparePartDetailComponent {
  readonly part = input.required<SparePart>();
  readonly closed = output<void>();

  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly typeLabels = SPARE_PART_TYPE_LABELS;
  protected readonly movementTypeLabel = STOCK_MOVEMENT_TYPE_LABEL;

  private readonly partId = computed(() => this.part().id);

  private readonly movementsResult = loadable(
    this.partId,
    (sparePartId) => this.inventoryService.listMovements({ sparePartId, take: HISTORY_TAKE }),
    { items: [], total: 0 },
  );
  protected readonly movements = this.movementsResult.value;
  protected readonly movementsLoading = this.movementsResult.loading;

  protected readonly subtitle = computed(() => {
    const part = this.part();
    return `${part.code} · ${this.typeLabels[part.type]}`;
  });

  protected readonly stockLabel = computed(() => {
    const part = this.part();
    if (!part.isActive) return 'Inactivo';
    return part.currentStock < part.minStock ? 'Bajo stock' : 'Disponible';
  });

  protected readonly stockTone = computed<BadgeTone>(() => {
    const part = this.part();
    if (!part.isActive) return 'gray';
    return part.currentStock < part.minStock ? 'red' : 'green';
  });

  /// La columna «Destino / origen» de la maqueta: en una salida es el vehículo o la orden de
  /// mantenimiento que consumió el artículo; en una entrada, el proveedor.
  protected readonly movementTarget = (movement: StockMovement): string =>
    movement.vehicle?.plate ??
    movement.maintenanceOrder?.code ??
    movement.supplier ??
    movement.reason ??
    '—';

  constructor(private readonly inventoryService: InventoryService) {}
}
