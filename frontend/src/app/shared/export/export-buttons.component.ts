import { Component, input, signal } from '@angular/core';
import { ButtonDirective } from '../button/button.directive';
import { IconComponent } from '../icon/icon.component';
import { ToastService } from '../toast/toast.service';
import { errorMessage } from '../error-message';
import { exportReportToExcel, exportReportToPdf, ReportColumn } from './report-export';

/**
 * Botones «Excel» / «PDF» de un reporte (fuera de alcance en spec 018, pedido explícitamente por
 * fuera del spec). `fetchRows` trae TODO el resultado filtrado vigente en la pantalla, no sólo la
 * página visible — cada pantalla decide cómo, reusando su propio filtro contra una consulta de una
 * sola vez (nunca `watchQuery`+`firstValueFrom`: aborta la petición, ver `vehicle-photos.service.ts`).
 */
@Component({
  selector: 'app-export-buttons',
  imports: [ButtonDirective, IconComponent],
  template: `
    <div class="flex items-center gap-2">
      <button
        type="button"
        appButton
        variant="outline"
        size="sm"
        [disabled]="busy()"
        (click)="onExport('excel')"
      >
        <app-icon name="download" class="h-3.5 w-3.5" />
        Excel
      </button>
      <button
        type="button"
        appButton
        variant="outline"
        size="sm"
        [disabled]="busy()"
        (click)="onExport('pdf')"
      >
        <app-icon name="download" class="h-3.5 w-3.5" />
        PDF
      </button>
    </div>
  `,
})
export class ExportButtonsComponent<T> {
  readonly title = input.required<string>();
  readonly filenameBase = input.required<string>();
  readonly columns = input.required<readonly ReportColumn<T>[]>();
  readonly filtersSummary = input<string | undefined>(undefined);
  readonly fetchRows = input.required<() => Promise<T[]>>();

  protected readonly busy = signal(false);

  constructor(private readonly toast: ToastService) {}

  protected async onExport(format: 'excel' | 'pdf'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const rows = await this.fetchRows()();
      if (rows.length === 0) {
        this.toast.info('No hay datos para exportar con los filtros actuales.');
        return;
      }
      const options = {
        filenameBase: this.filenameBase(),
        title: this.title(),
        filtersSummary: this.filtersSummary(),
        columns: this.columns(),
        rows,
      };
      if (format === 'excel') {
        exportReportToExcel(options);
      } else {
        await exportReportToPdf(options);
      }
    } catch (error) {
      this.toast.error(errorMessage(error, 'No se pudo generar el archivo.'));
    } finally {
      this.busy.set(false);
    }
  }
}
