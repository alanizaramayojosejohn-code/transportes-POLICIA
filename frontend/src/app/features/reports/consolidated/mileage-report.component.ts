import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ReportColumn } from '../../../shared/export/report-export';
import { ConsolidatedReportsService } from './consolidated-reports.service';
import { ReportFiltersComponent, reportOptions } from './report-filters.component';
import {
  decimalCell,
  EMPTY_MILEAGE_REPORT,
  EMPTY_REPORT_CRITERIA,
  intCell,
  MileageReport,
  MileageRow,
  ReportCriteria,
  ReportFilter,
  reportFiltersSummary,
  toReportFilter,
} from './consolidated-report.model';

/**
 * Reporte «Kilometraje recorrido» (spec 018, RF-20): salidas, retornos y
 * kilómetros del periodo, consolidados por vehículo o por unidad. El listado
 * de recorridos vive en Operaciones; esto es el acumulado del periodo, que no
 * existía en ninguna pantalla.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, ReportFiltersComponent],
  selector: 'app-mileage-report',
  templateUrl: './mileage-report.component.html',
})
export class MileageReportComponent {
  protected readonly criteria = signal<ReportCriteria>(EMPTY_REPORT_CRITERIA);
  protected readonly options = reportOptions();

  protected readonly decimal = decimalCell;
  protected readonly int = intCell;

  protected readonly showsVehicleCount = computed(() => this.criteria().groupBy === 'UNIT');
  protected readonly columnCount = computed(() => (this.showsVehicleCount() ? 6 : 5));
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

  protected readonly report: Signal<MileageReport>;
  protected readonly loading: Signal<boolean>;

  protected readonly exportColumns = computed<ReportColumn<MileageRow>[]>(() => [
    { header: this.groupHeader(), accessor: (row) => row.groupLabel },
    ...(this.showsVehicleCount()
      ? [{ header: 'Vehículos', accessor: (row: MileageRow) => row.vehicleCount }]
      : [{ header: 'Detalle', accessor: (row: MileageRow) => row.groupDetail }]),
    { header: 'Salidas', accessor: (row) => row.trips },
    { header: 'Cerrados', accessor: (row) => row.closedTrips },
    { header: 'Kilómetros', accessor: (row) => row.distanceKm },
    { header: 'Km prom. por recorrido', accessor: (row) => decimalCell(row.avgDistanceKm) },
  ]);

  protected readonly filtersSummary = computed(() =>
    reportFiltersSummary(this.criteria(), this.options()),
  );

  protected readonly fetchAllForExport = () =>
    this.consolidatedReports.listAllMileage(this.filters());

  constructor(private readonly consolidatedReports: ConsolidatedReportsService) {
    const result = loadable(
      this.query,
      (filter) => this.consolidatedReports.mileage(filter),
      EMPTY_MILEAGE_REPORT,
    );
    this.report = result.value;
    this.loading = result.loading;
  }
}
