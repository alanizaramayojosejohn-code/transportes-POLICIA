import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ReportColumn } from '../../../shared/export/report-export';
import { ConsolidatedReportsService } from './consolidated-reports.service';
import { ReportFiltersComponent, reportOptions } from './report-filters.component';
import {
  EMPTY_MAINTENANCE_COST_REPORT,
  EMPTY_REPORT_CRITERIA,
  intCell,
  MaintenanceCostReport,
  MaintenanceCostRow,
  moneyCell,
  ReportCriteria,
  ReportFilter,
  reportFiltersSummary,
  toReportFilter,
} from './consolidated-report.model';

/**
 * Reporte «Costos de mantenimiento» (spec 018, RF-19): órdenes del periodo
 * separadas en preventivas y correctivas, con su costo, consolidadas por
 * vehículo o por unidad. El listado de órdenes vive en su propio módulo; esto
 * es el gasto del periodo, que no existía en ninguna pantalla.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, ReportFiltersComponent],
  selector: 'app-maintenance-cost-report',
  templateUrl: './maintenance-cost-report.component.html',
})
export class MaintenanceCostReportComponent {
  protected readonly criteria = signal<ReportCriteria>(EMPTY_REPORT_CRITERIA);
  protected readonly options = reportOptions();

  protected readonly money = moneyCell;
  protected readonly int = intCell;

  protected readonly showsVehicleCount = computed(() => this.criteria().groupBy === 'UNIT');
  protected readonly columnCount = computed(() => (this.showsVehicleCount() ? 7 : 6));
  protected readonly groupHeader = computed(() =>
    this.criteria().groupBy === 'UNIT' ? 'Unidad' : 'Vehículo',
  );

  private readonly filters = computed(() => toReportFilter(this.criteria()));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<ReportFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  protected readonly report: Signal<MaintenanceCostReport>;
  protected readonly loading: Signal<boolean>;

  protected readonly exportColumns = computed<ReportColumn<MaintenanceCostRow>[]>(() => [
    { header: this.groupHeader(), accessor: (row) => row.groupLabel },
    ...(this.showsVehicleCount()
      ? [
          {
            header: 'Vehículos',
            accessor: (row: MaintenanceCostRow) => row.vehicleCount,
          },
        ]
      : [{ header: 'Detalle', accessor: (row: MaintenanceCostRow) => row.groupDetail }]),
    { header: 'Órdenes', accessor: (row) => row.orders },
    { header: 'Preventivas', accessor: (row) => row.preventive },
    { header: 'Correctivas', accessor: (row) => row.corrective },
    { header: 'Costo total', accessor: (row) => moneyCell(row.totalCost) },
    { header: 'Costo prom. por orden', accessor: (row) => moneyCell(row.avgCost) },
  ]);

  protected readonly filtersSummary = computed(() =>
    reportFiltersSummary(this.criteria(), this.options()),
  );

  protected readonly fetchAllForExport = () =>
    this.consolidatedReports.listAllMaintenanceCost(this.filters());

  constructor(private readonly consolidatedReports: ConsolidatedReportsService) {
    const result = loadable(
      this.query,
      (filter) => this.consolidatedReports.maintenanceCost(filter),
      EMPTY_MAINTENANCE_COST_REPORT,
    );
    this.report = result.value;
    this.loading = result.loading;
  }
}
