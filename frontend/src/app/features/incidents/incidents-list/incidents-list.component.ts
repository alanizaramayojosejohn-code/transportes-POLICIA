import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { IncidentsService } from '../incidents.service';
import {
  INCIDENT_TYPE_LABEL,
  INCIDENT_TYPES,
  IncidentFilter,
  IncidentType,
} from '../incident.model';
import { IncidentFormComponent } from '../incident-form/incident-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { NoticeComponent } from '../../../shared/notice/notice.component';

/** Incidentes vehiculares (spec 011). */
@Component({
  imports: [...LIST_PAGE_IMPORTS, IncidentFormComponent, NoticeComponent],
  selector: 'app-incidents-list',
  templateUrl: './incidents-list.component.html',
})
export class IncidentsListComponent {
  protected readonly search = signal('');
  protected readonly type = signal<IncidentType | ''>('');
  protected readonly types = INCIDENT_TYPES;
  protected readonly typeLabel = INCIDENT_TYPE_LABEL;

  private readonly filter = computed<IncidentFilter>(() => ({
    search: this.search() || undefined,
    type: this.type() || undefined,
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(switchMap((filter) => this.incidentsService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showForm = signal(false);
  protected readonly formatDateTime = formatDateTimeEs;

  constructor(
    private readonly incidentsService: IncidentsService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected closeForm(): void {
    this.showForm.set(false);
  }
}
