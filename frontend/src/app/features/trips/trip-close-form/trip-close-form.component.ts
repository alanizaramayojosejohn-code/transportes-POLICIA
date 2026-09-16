import { Component, input, output, signal } from '@angular/core';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { TripsService } from '../trips.service';
import { Trip } from '../trip.model';

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

  protected onOdometerInput(value: string): void {
    this.returnOdometer.set(value === '' ? null : Number(value));
  }

  protected onFuelLevelInput(value: string): void {
    this.returnFuelLevel.set(value === '' ? null : Number(value));
  }

  constructor(private readonly tripsService: TripsService) {}

  protected async submit(): Promise<void> {
    if (this.returnOdometer() === null) {
      this.errorMessage.set('El kilometraje de llegada es obligatorio.');
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
