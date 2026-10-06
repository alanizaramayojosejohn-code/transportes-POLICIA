import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { InventoryService } from '../inventory.service';
import {
  SparePartPage,
  STOCK_MOVEMENT_TYPE_LABEL,
  StockMovement,
  StockMovementFilter,
  StockMovementPage,
  StockMovementType,
} from '../spare-part.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { formatDateEs, formatDateTimeEs } from '../../../shared/date-format';
import { ReportColumn } from '../../../shared/export/report-export';

const TYPE_OPTIONS: StockMovementType[] = ['IN', 'OUT', 'ADJUSTMENT'];

/**
 * Reporte «Movimientos de almacén» (spec 018): entradas, salidas y ajustes de
 * inventario, filtrables por artículo, vehículo destino, tipo y fecha. No
 * existía como listado propio — sólo se leía anidado bajo un artículo. Vive
 * como pestaña de `/reportes` (`report-tab.ts`), así que no trae encabezado
 * de pantalla propio.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS],
  selector: 'app-stock-movements-list',
  templateUrl: './stock-movements-list.component.html',
})
export class StockMovementsListComponent {
  protected readonly typeLabel = STOCK_MOVEMENT_TYPE_LABEL;
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly sparePartId = signal('');
  protected readonly vehicleId = signal('');
  protected readonly type = signal<StockMovementType | ''>('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');

  protected readonly sparePartOptions: Signal<SparePartPage>;
  protected readonly vehicleOptions: Signal<VehicleOption[]>;
  protected readonly page: Signal<StockMovementPage>;
  protected readonly loading: Signal<boolean>;

  protected readonly exportColumns: ReportColumn<StockMovement>[] = [
    { header: 'Fecha', accessor: (m) => formatDateTimeEs(m.createdAt) },
    { header: 'Artículo', accessor: (m) => `${m.sparePart.code} · ${m.sparePart.name}` },
    { header: 'Tipo', accessor: (m) => this.typeLabel[m.type] },
    { header: 'Cantidad', accessor: (m) => `${m.quantity} ${m.sparePart.unit}` },
    { header: 'Saldo', accessor: (m) => `${m.balanceAfter} ${m.sparePart.unit}` },
    {
      header: 'Vehículo / Motivo',
      accessor: (m) => [m.vehicle?.plate, m.reason].filter(Boolean).join(' · ') || '—',
    },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.type()) parts.push(`Tipo: ${this.typeLabel[this.type() as StockMovementType]}`);
    if (this.fromDate()) parts.push(`Desde: ${formatDateEs(this.fromDate())}`);
    if (this.toDate()) parts.push(`Hasta: ${formatDateEs(this.toDate())}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () =>
    this.inventoryService.listAllMovements(this.filters());

  private readonly filters = computed(() => ({
    sparePartId: this.sparePartId() || undefined,
    vehicleId: this.vehicleId() || undefined,
    type: this.type() || undefined,
    fromDate: this.fromDate() || undefined,
    toDate: this.toDate() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<StockMovementFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly vehiclesService: VehiclesService,
  ) {
    // Se asigna aquí, no como inicializador de campo: un inicializador de
    // campo se ejecuta antes de que las propiedades de parámetro del
    // constructor queden asignadas (mismo motivo que MyVehicleComponent).
    this.sparePartOptions = toSignal(this.inventoryService.list({ isActive: true, take: 100 }), {
      initialValue: { items: [], total: 0 },
    });
    this.vehicleOptions = toSignal(this.vehiclesService.listAllActiveOptions(), {
      initialValue: [],
    });
    const result = loadable(this.query, (filter) => this.inventoryService.listMovements(filter), {
      items: [],
      total: 0,
    });
    this.page = result.value;
    this.loading = result.loading;
  }

  protected clearFilters(): void {
    this.sparePartId.set('');
    this.vehicleId.set('');
    this.type.set('');
    this.fromDate.set('');
    this.toDate.set('');
  }
}
