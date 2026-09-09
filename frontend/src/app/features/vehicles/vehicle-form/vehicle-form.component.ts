import { Component, effect, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { VehiclesService } from '../vehicles.service';
import { CreateVehicleInput, VEHICLE_TYPE_LABEL, Vehicle, VehicleType } from '../vehicle.model';

/**
 * Alta y edición de vehículo (spec 001, RF-01/RF-03/RF-04). Placa y tipo son
 * los únicos campos obligatorios; el resto se completa cuando se conoce.
 * Sin librería de formularios (no está aprobada en este proyecto): estado
 * en un signal simple, igual que el resto de la feature.
 */
@Component({
  imports: [ModalComponent],
  selector: 'app-vehicle-form',
  templateUrl: './vehicle-form.component.html',
})
export class VehicleFormComponent {
  readonly vehicle = input<Vehicle | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly types: VehicleType[] = [
    'CAMIONETA',
    'AUTOMOVIL',
    'MOTOCICLETA',
    'MINIBUS',
    'CAMION',
    'AMBULANCIA',
    'OTRO',
  ];
  protected readonly typeLabels = VEHICLE_TYPE_LABEL;

  protected readonly form = signal<CreateVehicleInput>({ plate: '', type: 'CAMIONETA' });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(private readonly vehiclesService: VehiclesService) {
    // `input()` no garantiza el valor real del padre en el inicializador de
    // campo (sólo el default); un `effect` sí reacciona de forma fiable
    // cuando el padre pasa un vehículo (modo edición).
    effect(() => {
      this.form.set(this.initialValue());
    });
  }

  protected get isEdit(): boolean {
    return this.vehicle() !== null;
  }

  protected patch(partial: Partial<CreateVehicleInput>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!value.plate.trim() || !value.type) {
      this.errorMessage.set('La placa y el tipo de vehículo son obligatorios.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const current = this.vehicle();
      if (current) {
        await this.vehiclesService.update(current.id, value);
      } else {
        await this.vehiclesService.create(value);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el vehículo.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private initialValue(): CreateVehicleInput {
    const vehicle = this.vehicle();
    if (!vehicle) {
      return { plate: '', type: 'CAMIONETA' };
    }
    return {
      plate: vehicle.plate,
      plateDnfr: vehicle.plateDnfr ?? undefined,
      type: vehicle.type,
      brand: vehicle.brand ?? undefined,
      model: vehicle.model ?? undefined,
      year: vehicle.year ?? undefined,
      color: vehicle.color ?? undefined,
      chassisNumber: vehicle.chassisNumber ?? undefined,
      engineNumber: vehicle.engineNumber ?? undefined,
      origin: vehicle.origin ?? undefined,
      receptionSource: vehicle.receptionSource ?? undefined,
      observations: vehicle.observations ?? undefined,
    };
  }
}
