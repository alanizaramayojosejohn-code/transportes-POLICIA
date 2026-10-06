import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ConnectivityService } from '../../../core/offline/connectivity.service';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { formatDateTimeEs, toDateTimeInputValue } from '../../../shared/date-format';
import { ToastService } from '../../../shared/toast/toast.service';
import { TripsService } from '../trips.service';
import { Trip } from '../trip.model';
import { FormValidation } from '../../../shared/validation/form-validation';
import {
  combine,
  max,
  min,
  minField,
  required,
  requiredIf,
} from '../../../shared/validation/validators';
import { TripConditionFieldComponent } from '../trip-condition-field/trip-condition-field.component';
import { TripConditionSelection, composeConditionNotes } from '../trip-condition';

interface TripCloseFormShape {
  returnAt: string;
  returnOdometer: number | null;
  returnFuelLevel: number | null;
  conditionCode: TripConditionSelection;
  conditionOther: string;
  departureAt: string;
  departureOdometer: number;
}

/** Registro de llegada de un recorrido abierto (spec 006, RF-5). */
@Component({
  imports: [...FORM_MODAL_IMPORTS, TripConditionFieldComponent],
  selector: 'app-trip-close-form',
  templateUrl: './trip-close-form.component.html',
})
export class TripCloseFormComponent {
  readonly trip = input.required<Trip>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  /**
   * La fecha de llegada ahora es un campo, no el `new Date()` que ponía el
   * servidor al recibir la mutación. Hace falta para que un registro hecho
   * sin conexión guarde la hora en que el vehículo volvió y no la hora en
   * que el equipo recuperó la red (spec 006, RF-15).
   */
  protected readonly returnAt = signal(toDateTimeInputValue());
  protected readonly returnOdometer = signal<number | null>(null);
  protected readonly returnFuelLevel = signal<number | null>(null);
  protected readonly conditionCode = signal<TripConditionSelection>('');
  protected readonly conditionOther = signal('');
  protected readonly damagesFound = signal('');
  protected readonly incidentNotes = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly online = inject(ConnectivityService).online;
  protected readonly formatDateTime = formatDateTimeEs;

  private readonly formShape = computed<TripCloseFormShape>(() => ({
    returnAt: this.returnAt(),
    returnOdometer: this.returnOdometer(),
    returnFuelLevel: this.returnFuelLevel(),
    conditionCode: this.conditionCode(),
    conditionOther: this.conditionOther(),
    departureAt: this.trip().departureAt,
    departureOdometer: this.trip().departureOdometer,
  }));
  protected readonly validation = new FormValidation(this.formShape, {
    returnAt: combine<string, TripCloseFormShape>(
      required('Ingrese la fecha y hora de llegada.'),
      (value, form) =>
        new Date(value).getTime() < new Date(form.departureAt).getTime()
          ? `No puede ser anterior a la salida (${formatDateTimeEs(form.departureAt)}).`
          : null,
    ),
    returnOdometer: combine<number | null, TripCloseFormShape>(
      required('Ingrese el kilometraje de llegada.'),
      min(0, 'El kilometraje no puede ser negativo.'),
      minField(
        (form) => form.departureOdometer,
        (departure) => `No puede ser menor al kilometraje de salida (${departure}).`,
      ),
    ),
    returnFuelLevel: combine<number | null, TripCloseFormShape>(
      min(0, 'El nivel de combustible no puede ser menor a 0%.'),
      max(100, 'El nivel de combustible no puede ser mayor a 100%.'),
    ),
    conditionOther: requiredIf<string, TripCloseFormShape>(
      (form) => form.conditionCode === 'OTRO',
      'Describa el estado del vehículo.',
    ),
  });

  protected onOdometerInput(value: string): void {
    this.returnOdometer.set(value === '' ? null : Number(value));
  }

  protected onFuelLevelInput(value: string): void {
    this.returnFuelLevel.set(value === '' ? null : Number(value));
  }

  private readonly toast = inject(ToastService);

  constructor(private readonly tripsService: TripsService) {}

  protected async submit(): Promise<void> {
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const trip = this.trip();
    try {
      const result = await this.tripsService.close(
        trip.id,
        {
          returnAt: new Date(this.returnAt()).toISOString(),
          returnOdometer: this.returnOdometer()!,
          returnFuelLevel: this.returnFuelLevel() ?? undefined,
          returnConditionNotes: composeConditionNotes(this.conditionCode(), this.conditionOther()),
          damagesFound: this.damagesFound() || undefined,
          incidentNotes: this.incidentNotes() || undefined,
        },
        {
          vehiclePlate: trip.vehicle.plate,
          driverName: `${trip.driver.firstName} ${trip.driver.lastName}`.trim(),
        },
      );
      if (result.queued) {
        this.toast.info(
          `Llegada de ${trip.destination} guardada sin conexión; se enviará al reconectar.`,
        );
      } else {
        this.toast.success(`Recorrido a ${trip.destination} cerrado.`);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo registrar la llegada.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
