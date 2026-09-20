import { Component, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { DataCellComponent } from '../../../shared/data-cell/data-cell.component';
import { TimelineItemComponent } from '../../../shared/timeline-item/timeline-item.component';
import { FieldComponent } from '../../../shared/field/field.component';
import { FieldControlDirective } from '../../../shared/field/field-control.directive';
import { ManagerAssignmentFormComponent } from '../manager-assignment-form/manager-assignment-form.component';
import { UnitsService } from '../units.service';
import { VehiclesService } from '../../vehicles/vehicles.service';
import { formatDateEs } from '../../../shared/date-format';

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

  protected readonly unit = toSignal(
    this.unitId$.pipe(switchMap((id) => this.unitsService.get(id))),
    { initialValue: null },
  );

  /// «Un encargado tiene todos los vehículos de la unidad a su cargo»: la
  /// lectura operativa que pidió el spec 002 (enmienda) es esta lista, con
  /// el conductor encargado de cada uno.
  protected readonly vehicles = toSignal(
    this.unitId$.pipe(switchMap((id) => this.vehiclesService.list({ unitId: id, take: 100 }))),
    { initialValue: { items: [], total: 0 } },
  );

  constructor(
    private readonly unitsService: UnitsService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  protected async toggleActive(): Promise<void> {
    const unit = this.unit();
    if (!unit) return;
    this.actionError.set(null);
    try {
      if (unit.isActive) {
        await this.unitsService.deactivate(unit.id);
      } else {
        await this.unitsService.reactivate(unit.id);
      }
    } catch (error) {
      this.actionError.set(
        error instanceof Error ? error.message : 'No se pudo completar la operación.',
      );
    }
  }

  protected async closeAssignment(): Promise<void> {
    this.actionError.set(null);
    try {
      await this.unitsService.closeTransportManagerAssignment({
        unitId: this.unitId(),
        endDate: this.closeDate(),
      });
      this.closingAssignment.set(false);
    } catch (error) {
      this.actionError.set(
        error instanceof Error ? error.message : 'No se pudo cerrar la designación.',
      );
    }
  }
}
