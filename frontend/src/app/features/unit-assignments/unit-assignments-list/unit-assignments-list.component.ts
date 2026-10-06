import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { UnitAssignmentsService } from '../unit-assignments.service';
import { UnitAssignment, UnitAssignmentFilter } from '../unit-assignment.model';
import { ReportColumn } from '../../../shared/export/report-export';
import { UnitAssignmentFormComponent } from '../unit-assignment-form/unit-assignment-form.component';
import { UnitAssignmentDetailComponent } from '../unit-assignment-detail/unit-assignment-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateEs, toDateInputValue } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { FieldComponent } from '../../../shared/field/field.component';
import { FieldControlDirective } from '../../../shared/field/field-control.directive';
import { NoticeComponent } from '../../../shared/notice/notice.component';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    UnitAssignmentFormComponent,
    UnitAssignmentDetailComponent,
    FieldComponent,
    FieldControlDirective,
    NoticeComponent,
  ],
  selector: 'app-unit-assignments-list',
  templateUrl: './unit-assignments-list.component.html',
})
export class UnitAssignmentsListComponent {
  protected readonly formatDate = formatDateEs;
  protected readonly search = signal('');
  protected readonly status = signal<'' | 'ACTUAL' | 'HISTORICA'>('');

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    current: this.status() === '' ? undefined : this.status() === 'ACTUAL',
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<UnitAssignmentFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(
    this.query,
    (filter) => this.unitAssignmentsService.list(filter),
    {
      items: [],
      total: 0,
    },
  );
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly detailAssignmentId = signal<string | null>(null);
  protected readonly detailAssignment = computed(
    () => this.page().items.find((a) => a.id === this.detailAssignmentId()) ?? null,
  );

  protected readonly exportColumns: ReportColumn<UnitAssignment>[] = [
    { header: 'Vehículo', accessor: (a) => a.vehicle.plate },
    { header: 'Unidad', accessor: (a) => a.unit.name },
    { header: 'Inicio', accessor: (a) => this.formatDate(a.startDate) },
    { header: 'Fin', accessor: (a) => (a.endDate ? this.formatDate(a.endDate) : '—') },
    { header: 'Motivo', accessor: (a) => a.reason || '—' },
    { header: 'Documento', accessor: (a) => a.referenceDocument || '—' },
    { header: 'Estado', accessor: (a) => (a.endDate ? 'Histórica' : 'Actual') },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.status())
      parts.push(`Estado: ${this.status() === 'ACTUAL' ? 'Actuales' : 'Históricas'}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => this.unitAssignmentsService.listAll(this.filters());

  protected readonly showCreateForm = signal(false);

  /// Sólo una fila puede tener su panel de acción (cerrar/editar) abierto a
  /// la vez, para no complicar el estado con un signal por fila.
  protected readonly activeActionVehicleId = signal<string | null>(null);
  protected readonly actionMode = signal<'close' | 'edit' | null>(null);
  protected readonly closeDate = signal(toDateInputValue());
  protected readonly editReason = signal('');
  protected readonly editReferenceDocument = signal('');
  protected readonly editNotes = signal('');
  protected readonly actionError = signal<string | null>(null);

  private readonly toast = inject(ToastService);

  constructor(
    private readonly unitAssignmentsService: UnitAssignmentsService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected openClose(vehicleId: string): void {
    this.activeActionVehicleId.set(vehicleId);
    this.actionMode.set('close');
    this.actionError.set(null);
  }

  protected openEdit(
    vehicleId: string,
    reason: string | null,
    doc: string | null,
    notes: string | null,
  ): void {
    this.activeActionVehicleId.set(vehicleId);
    this.actionMode.set('edit');
    this.editReason.set(reason ?? '');
    this.editReferenceDocument.set(doc ?? '');
    this.editNotes.set(notes ?? '');
    this.actionError.set(null);
  }

  protected closeActionPanel(): void {
    this.activeActionVehicleId.set(null);
    this.actionMode.set(null);
  }

  /// Sin confirmación adicional: el panel ya obliga a elegir la fecha de cierre antes de
  /// habilitar esta acción, que es un paso deliberado de por sí.
  protected async confirmClose(): Promise<void> {
    const vehicleId = this.activeActionVehicleId();
    if (!vehicleId) return;
    const plate = this.page().items.find((a) => a.vehicle.id === vehicleId)?.vehicle.plate;
    try {
      await this.unitAssignmentsService.close({ vehicleId, endDate: this.closeDate() });
      this.closeActionPanel();
      this.toast.success(`Asignación${plate ? ` del vehículo ${plate}` : ''} cerrada.`);
    } catch (error) {
      this.actionError.set(this.toast.reportError(error, 'No se pudo cerrar la asignación.'));
    }
  }

  protected async confirmEdit(): Promise<void> {
    const vehicleId = this.activeActionVehicleId();
    if (!vehicleId) return;
    try {
      await this.unitAssignmentsService.updateNotes({
        vehicleId,
        reason: this.editReason() || undefined,
        referenceDocument: this.editReferenceDocument() || undefined,
        notes: this.editNotes() || undefined,
      });
      this.closeActionPanel();
      this.toast.success('Datos de la asignación actualizados.');
    } catch (error) {
      this.actionError.set(this.toast.reportError(error, 'No se pudo guardar el cambio.'));
    }
  }
}
