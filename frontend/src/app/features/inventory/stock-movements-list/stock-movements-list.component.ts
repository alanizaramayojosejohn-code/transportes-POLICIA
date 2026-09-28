import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { InventoryService } from '../inventory.service';
import {
  SparePartPage,
  STOCK_MOVEMENT_TYPE_LABEL,
  StockMovementFilter,
  StockMovementPage,
  StockMovementType,
} from '../spare-part.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { formatDateTimeEs } from '../../../shared/date-format';

const TYPE_OPTIONS: StockMovementType[] = ['IN', 'OUT', 'ADJUSTMENT'];

/**
 * Reporte «Movimientos de almacén» (spec 018): entradas, salidas y ajustes de
 * inventario, filtrables por artículo, vehículo destino, tipo y fecha. No
 * existía como listado propio — sólo se leía anidado bajo un artículo.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, RouterLink],
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
    this.page = toSignal(
      toObservable(this.query).pipe(
        switchMap((filter) => this.inventoryService.listMovements(filter)),
      ),
      { initialValue: { items: [], total: 0 } },
    );
  }

  protected clearFilters(): void {
    this.sparePartId.set('');
    this.vehicleId.set('');
    this.type.set('');
    this.fromDate.set('');
    this.toDate.set('');
  }
}
