import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { UnitAssignmentsService } from '../unit-assignments.service';
import { UnitAssignmentFilter } from '../unit-assignment.model';
import { UnitAssignmentFormComponent } from '../unit-assignment-form/unit-assignment-form.component';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateEs } from '../../../shared/date-format';

@Component({
  imports: [UnitAssignmentFormComponent, BadgeComponent],
  selector: 'app-unit-assignments-list',
  templateUrl: './unit-assignments-list.component.html',
})
export class UnitAssignmentsListComponent {
  protected readonly formatDate = formatDateEs;
  protected readonly search = signal('');
  protected readonly status = signal<'' | 'ACTUAL' | 'HISTORICA'>('');

  private readonly filter = computed<UnitAssignmentFilter>(() => ({
    search: this.search() || undefined,
    current: this.status() === '' ? undefined : this.status() === 'ACTUAL',
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(switchMap((filter) => this.unitAssignmentsService.list(filter))),
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
