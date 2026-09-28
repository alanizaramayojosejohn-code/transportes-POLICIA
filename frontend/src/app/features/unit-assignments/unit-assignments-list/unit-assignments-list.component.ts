import { Component, computed, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { UnitAssignmentsService } from '../unit-assignments.service';
import { UnitAssignmentFilter } from '../unit-assignment.model';
import { UnitAssignmentFormComponent } from '../unit-assignment-form/unit-assignment-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { FieldComponent } from '../../../shared/field/field.component';
import { FieldControlDirective } from '../../../shared/field/field-control.directive';
import { NoticeComponent } from '../../../shared/notice/notice.component';

@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    UnitAssignmentFormComponent,
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

  protected readonly page = toSignal(
    toObservable(this.query).pipe(switchMap((filter) => this.unitAssignmentsService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showCreateForm = signal(false);

  /// Sólo una fila puede tener su panel de acción (cerrar/editar) abierto a
  /// la vez, para no complicar el estado con un signal por fila.
  protected readonly activeActionVehicleId = signal<string | null>(null);
  protected readonly actionMode = signal<'close' | 'edit' | null>(null);
  protected readonly closeDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly editReason = signal('');
  protected readonly editReferenceDocument = signal('');
  protected readonly editNotes = signal('');
  protected readonly actionError = signal<string | null>(null);

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

  protected async confirmClose(): Promise<void> {
    const vehicleId = this.activeActionVehicleId();
    if (!vehicleId) return;
    try {
      await this.unitAssignmentsService.close({ vehicleId, endDate: this.closeDate() });
      this.closeActionPanel();
    } catch (error) {
      this.actionError.set(
        error instanceof Error ? error.message : 'No se pudo cerrar la asignación.',
      );
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
    } catch (error) {
      this.actionError.set(
        error instanceof Error ? error.message : 'No se pudo guardar el cambio.',
      );
    }
  }
}
