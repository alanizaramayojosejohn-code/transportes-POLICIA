import { Component, computed, Signal } from '@angular/core';
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
import { FuelRecordsService } from '../../fuel-records/fuel-records.service';
import { FUEL_TYPE_LABEL, FuelRecordPage } from '../../fuel-records/fuel-record.model';
import { formatDateTimeEs } from '../../../shared/date-format';
import { loadableOf } from '../../../shared/loadable';

const RECENT_TAKE = 50;
const TABLE_TAKE = 10;

/**
 * Panel de inicio del rol COMBUSTIBLE: no está acotado por unidad (spec 015,
 * "Fuera de alcance") — muestra el mismo parque completo que la pantalla de
 * Combustible, resumido. Sin endpoint de agregados propio, los totales se
 * calculan sobre la última página consultada (`RECENT_TAKE`), no sobre todo
 * el historial: se rotula "recientes" para no insinuar un corte mensual que
 * el backend no calcula.
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
  selector: 'app-fuel-dashboard',
  templateUrl: './fuel-dashboard.component.html',
})
export class FuelDashboardComponent {
  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;

  protected readonly recent: Signal<FuelRecordPage>;
  protected readonly loading: Signal<boolean>;

  protected readonly recentQuantity = computed(() =>
    this.recent().items.reduce((sum, record) => sum + record.quantity, 0),
  );
  protected readonly recentCost = computed(() =>
    this.recent().items.reduce((sum, record) => sum + record.totalCost, 0),
  );
  protected readonly tableItems = computed(() => this.recent().items.slice(0, TABLE_TAKE));

  constructor(private readonly fuelRecordsService: FuelRecordsService) {
    const result = loadableOf(this.fuelRecordsService.list({ take: RECENT_TAKE }), {
      items: [],
      total: 0,
    });
    this.recent = result.value;
    this.loading = result.loading;
  }
}
