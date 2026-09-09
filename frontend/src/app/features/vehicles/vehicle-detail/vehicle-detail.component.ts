import { Component, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { DrawerComponent } from '../../../shared/drawer/drawer.component';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { VehiclesService } from '../vehicles.service';
import {
  VEHICLE_CONDITION_BADGE,
  VEHICLE_CONDITION_LABEL,
  VEHICLE_TYPE_LABEL,
  VehicleConditionCode,
} from '../vehicle.model';
import { formatDateEs } from '../../../shared/date-format';

const CONDITION_CODES: VehicleConditionCode[] = [
  'BUENO',
  'REGULAR',
  'DETERIORADO',
  'FUERA_DE_USO',
  'INOPERABLE',
  'EXTRAVIADO',
  'DEVUELTO',
  'BAJA',
];

/** Ficha del vehículo (spec 001, RF-10): datos, condición vigente e historial. */
@Component({
  imports: [DrawerComponent, BadgeComponent],
  selector: 'app-vehicle-detail',
  templateUrl: './vehicle-detail.component.html',
})
export class VehicleDetailComponent {
  readonly vehicleId = input.required<string>();
  readonly canWrite = input(false);
  readonly closed = output<void>();
  readonly editRequested = output<void>();

  protected readonly conditionLabels = VEHICLE_CONDITION_LABEL;
  protected readonly conditionBadge = VEHICLE_CONDITION_BADGE;
  protected readonly typeLabels = VEHICLE_TYPE_LABEL;
  protected readonly conditionCodes = CONDITION_CODES;
  protected readonly formatDate = formatDateEs;

  protected readonly showConditionForm = signal(false);
  protected readonly newCode = signal<VehicleConditionCode>('BUENO');
  protected readonly newReason = signal('');
  protected readonly submitting = signal(false);

  private readonly vehicleId$ = toObservable(this.vehicleId);

  protected readonly vehicle = toSignal(
    this.vehicleId$.pipe(switchMap((id) => this.vehiclesService.get(id))),
    { initialValue: null },
  );

  constructor(private readonly vehiclesService: VehiclesService) {}

  protected async registerCondition(): Promise<void> {
    this.submitting.set(true);
    try {
      await this.vehiclesService.registerCondition(this.vehicleId(), {
        code: this.newCode(),
        reason: this.newReason() || undefined,
      });
      this.showConditionForm.set(false);
      this.newReason.set('');
    } finally {
      this.submitting.set(false);
    }
  }
}
