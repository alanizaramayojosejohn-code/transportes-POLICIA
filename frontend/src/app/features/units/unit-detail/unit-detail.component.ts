import { Component, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { DataCellComponent } from '../../../shared/data-cell/data-cell.component';
import { TimelineItemComponent } from '../../../shared/timeline-item/timeline-item.component';
import { FieldComponent } from '../../../shared/field/field.component';
import { FieldControlDirective } from '../../../shared/field/field-control.directive';
import { SpinnerComponent } from '../../../shared/spinner/spinner.component';
import { loadable } from '../../../shared/loadable';
import { ManagerAssignmentFormComponent } from '../manager-assignment-form/manager-assignment-form.component';
import { UnitsService } from '../units.service';
import { VehiclesService } from '../../vehicles/vehicles.service';
import { formatDateEs } from '../../../shared/date-format';
import { activationConfirm } from '../../../shared/confirm/activation-confirm';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { errorMessage } from '../../../shared/error-message';
import { ToastService } from '../../../shared/toast/toast.service';

/** Ficha de la unidad (spec 002, RF-11): jerarquía, encargado vigente e historial. */
@Component({
  imports: [
    ModalComponent,
    BadgeComponent,
    ButtonDirective,
    DataCellComponent,
    TimelineItemComponent,
    FieldComponent,
    FieldControlDirective,
    SpinnerComponent,
    ManagerAssignmentFormComponent,
  ],
  selector: 'app-unit-detail',
  templateUrl: './unit-detail.component.html',
})
export class UnitDetailComponent {
  readonly unitId = input.required<string>();
  readonly canWrite = input(false);
  readonly closed = output<void>();
  readonly editRequested = output<void>();

  protected readonly formatDate = formatDateEs;
  protected readonly showAssignForm = signal(false);
  protected readonly closingAssignment = signal(false);
  protected readonly closeDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly actionError = signal<string | null>(null);

  private readonly unitId$ = toObservable(this.unitId);

  private readonly unitResult = loadable(this.unitId, (id) => this.unitsService.get(id), null);
  protected readonly unit = this.unitResult.value;
  protected readonly loading = this.unitResult.loading;

  /// «Un encargado tiene todos los vehículos de la unidad a su cargo»: la
  /// lectura operativa que pidió el spec 002 (enmienda) es esta lista, con
  /// el conductor encargado de cada uno.
  protected readonly vehicles = toSignal(
    this.unitId$.pipe(switchMap((id) => this.vehiclesService.list({ unitId: id, take: 100 }))),
    { initialValue: { items: [], total: 0 } },
  );

  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  constructor(
    private readonly unitsService: UnitsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  protected async toggleActive(): Promise<void> {
    const unit = this.unit();
    if (!unit) return;

    const confirmed = await this.confirm.ask(
      activationConfirm(unit.isActive, {
        subject: 'la unidad',
        name: unit.name,
        effect: 'dejará de ofrecerse al asignar vehículos, personal o encargados',
        restoredEffect: 'vuelve a ofrecerse al asignar vehículos, personal y encargados',
      }),
    );
    if (!confirmed) return;

    this.actionError.set(null);
    try {
      if (unit.isActive) {
        await this.unitsService.deactivate(unit.id);
        this.toast.success(`Unidad ${unit.name} dada de baja.`);
      } else {
        await this.unitsService.reactivate(unit.id);
        this.toast.success(`Unidad ${unit.name} reactivada.`);
      }
    } catch (error) {
      const message = errorMessage(
        error,
        unit.isActive ? 'No se pudo dar de baja la unidad.' : 'No se pudo reactivar la unidad.',
      );
      this.actionError.set(message);
      this.toast.error(message);
    }
  }

  /// Sin confirmación adicional: el panel ya obliga a elegir la fecha de cierre y a pulsar
  /// «Cerrar designación», que es un paso deliberado de por sí.
  protected async closeAssignment(): Promise<void> {
    this.actionError.set(null);
    try {
      await this.unitsService.closeTransportManagerAssignment({
        unitId: this.unitId(),
        endDate: this.closeDate(),
      });
      this.closingAssignment.set(false);
      this.toast.success('Designación de encargado cerrada.');
    } catch (error) {
      const message = errorMessage(error, 'No se pudo cerrar la designación.');
      this.actionError.set(message);
      this.toast.error(message);
    }
  }
}
