import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ReportColumn } from '../../../shared/export/report-export';
import { ConsolidatedReportsService } from './consolidated-reports.service';
import { ReportFiltersComponent, reportOptions } from './report-filters.component';
import {
  decimalCell,
  EMPTY_FUEL_CONSUMPTION_REPORT,
  EMPTY_REPORT_CRITERIA,
  FuelConsumptionReport,
  FuelConsumptionRow,
  intCell,
  moneyCell,
  ReportCriteria,
  ReportFilter,
  reportFiltersSummary,
  toReportFilter,
} from './consolidated-report.model';

/**
 * Reporte «Consumo de combustible» (spec 018, RF-18): litros, importe y
 * rendimiento del periodo, consolidados por vehículo o por unidad. No es el
 * listado de cargas — ese vive en el módulo Combustible con sus propios
 * filtros; esto es la suma del periodo, que no existía en ninguna pantalla.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, ReportFiltersComponent],
  selector: 'app-fuel-consumption-report',
  templateUrl: './fuel-consumption-report.component.html',
})
export class FuelConsumptionReportComponent {
  protected readonly criteria = signal<ReportCriteria>(EMPTY_REPORT_CRITERIA);
  protected readonly options = reportOptions();

  protected readonly decimal = decimalCell;
  protected readonly money = moneyCell;
  protected readonly int = intCell;

  /// La columna «Vehículos» sólo dice algo agrupando por unidad: por vehículo
  /// siempre valdría 1.
  protected readonly showsVehicleCount = computed(() => this.criteria().groupBy === 'UNIT');
  protected readonly columnCount = computed(() => (this.showsVehicleCount() ? 8 : 7));
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

  protected readonly report: Signal<FuelConsumptionReport>;
  protected readonly loading: Signal<boolean>;

  protected readonly exportColumns = computed<ReportColumn<FuelConsumptionRow>[]>(() => [
    { header: this.groupHeader(), accessor: (row) => row.groupLabel },
    ...(this.showsVehicleCount()
      ? [
          {
            header: 'Vehículos',
            accessor: (row: FuelConsumptionRow) => row.vehicleCount,
          },
        ]
      : [{ header: 'Detalle', accessor: (row: FuelConsumptionRow) => row.groupDetail }]),
    { header: 'Cargas', accessor: (row) => row.records },
    { header: 'Litros', accessor: (row) => decimalCell(row.liters) },
    { header: 'Importe', accessor: (row) => moneyCell(row.totalCost) },
    { header: 'Precio prom. (Bs./L)', accessor: (row) => decimalCell(row.avgUnitPrice) },
    { header: 'Km del periodo', accessor: (row) => row.distanceKm },
    { header: 'Rendimiento (km/L)', accessor: (row) => decimalCell(row.efficiencyKmPerLiter) },
  ]);

  protected readonly filtersSummary = computed(() =>
    reportFiltersSummary(this.criteria(), this.options()),
  );

  protected readonly fetchAllForExport = () =>
    this.consolidatedReports.listAllFuelConsumption(this.filters());

  constructor(private readonly consolidatedReports: ConsolidatedReportsService) {
    const result = loadable(
      this.query,
      (filter) => this.consolidatedReports.fuelConsumption(filter),
      EMPTY_FUEL_CONSUMPTION_REPORT,
    );
    this.report = result.value;
    this.loading = result.loading;
  }
}
