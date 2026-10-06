import { Component, computed, linkedSignal, signal } from '@angular/core';
import { IncidentsService } from '../incidents.service';
import {
  INCIDENT_TYPE_LABEL,
  INCIDENT_TYPES,
  Incident,
  IncidentFilter,
  IncidentType,
} from '../incident.model';
import { ReportColumn } from '../../../shared/export/report-export';
import { IncidentFormComponent } from '../incident-form/incident-form.component';
import { IncidentDetailComponent } from '../incident-detail/incident-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { NoticeComponent } from '../../../shared/notice/notice.component';

/** Incidentes vehiculares (spec 011). */
@Component({
  imports: [...LIST_PAGE_IMPORTS, IncidentFormComponent, IncidentDetailComponent, NoticeComponent],
  selector: 'app-incidents-list',
  templateUrl: './incidents-list.component.html',
})
export class IncidentsListComponent {
  protected readonly search = signal('');
  protected readonly type = signal<IncidentType | ''>('');
  protected readonly types = INCIDENT_TYPES;
  protected readonly typeLabel = INCIDENT_TYPE_LABEL;

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    type: this.type() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<IncidentFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(this.query, (filter) => this.incidentsService.list(filter), {
    items: [],
    total: 0,
  });
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly exportColumns: ReportColumn<Incident>[] = [
    { header: 'Fecha', accessor: (i) => formatDateTimeEs(i.occurredAt) },
    { header: 'Vehículo', accessor: (i) => i.vehicle.plate },
    {
      header: 'Conductor',
      accessor: (i) => (i.driver ? `${i.driver.firstName} ${i.driver.lastName}` : '—'),
    },
    { header: 'Tipo', accessor: (i) => this.typeLabel[i.type] },
    { header: 'Lugar', accessor: (i) => i.place },
    { header: 'Referencia', accessor: (i) => i.policeReportNumber || i.code },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.type()) parts.push(`Tipo: ${this.typeLabel[this.type() as IncidentType]}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => this.incidentsService.listAll(this.filters());

  protected readonly showForm = signal(false);
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly detailIncidentId = signal<string | null>(null);
  protected readonly detailIncident = computed(
    () => this.page().items.find((i) => i.id === this.detailIncidentId()) ?? null,
  );

  constructor(
    private readonly incidentsService: IncidentsService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected closeForm(): void {
    this.showForm.set(false);
  }
}
