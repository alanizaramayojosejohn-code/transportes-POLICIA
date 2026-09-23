import { Component, computed, input, output, signal } from '@angular/core';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { TripsService } from '../trips.service';
import { Trip } from '../trip.model';
import { FormValidation } from '../../../shared/validation/form-validation';
import { combine, max, min, minField, required } from '../../../shared/validation/validators';

interface TripCloseFormShape {
  returnOdometer: number | null;
  returnFuelLevel: number | null;
  departureOdometer: number;
}

/** Registro de llegada de un recorrido abierto (spec 006, RF-5). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-trip-close-form',
  templateUrl: './trip-close-form.component.html',
})
export class TripCloseFormComponent {
  readonly trip = input.required<Trip>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly returnOdometer = signal<number | null>(null);
  protected readonly returnFuelLevel = signal<number | null>(null);
  protected readonly returnConditionNotes = signal('');
  protected readonly damagesFound = signal('');
  protected readonly incidentNotes = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formShape = computed<TripCloseFormShape>(() => ({
    returnOdometer: this.returnOdometer(),
    returnFuelLevel: this.returnFuelLevel(),
    departureOdometer: this.trip().departureOdometer,
  }));
  protected readonly validation = new FormValidation(this.formShape, {
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
  });

  protected onOdometerInput(value: string): void {
    this.returnOdometer.set(value === '' ? null : Number(value));
  }

  protected onFuelLevelInput(value: string): void {
    this.returnFuelLevel.set(value === '' ? null : Number(value));
  }

  constructor(private readonly tripsService: TripsService) {}

  protected async submit(): Promise<void> {
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.tripsService.close(this.trip().id, {
        returnOdometer: this.returnOdometer()!,
        returnFuelLevel: this.returnFuelLevel() ?? undefined,
        returnConditionNotes: this.returnConditionNotes() || undefined,
        damagesFound: this.damagesFound() || undefined,
        incidentNotes: this.incidentNotes() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar la llegada.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
