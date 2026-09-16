import { Component, computed, effect, input, output, signal } from '@angular/core';
import { VehiclesService } from '../vehicles.service';
import { CreateVehicleInput, VEHICLE_TYPE_LABEL, Vehicle, VehicleType } from '../vehicle.model';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ToastService } from '../../../shared/toast/toast.service';

interface PhotoSlot {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
}

/** Las 7 vistas obligatorias de un vehículo (`prototipo/js/app.js:154-162`); las motocicletas
 * omiten interior y chasis (5 vistas, `:164-170`). */
const PHOTO_SLOTS_VEHICLE: readonly PhotoSlot[] = [
  { key: 'frontal', label: 'Frontal', hint: 'Vista completa desde el frente' },
  { key: 'trasero', label: 'Trasero', hint: 'Vista completa desde atrás' },
  {
    key: 'lateralIzquierdo',
    label: 'Lateral izquierdo',
    hint: 'Perfil completo del lado izquierdo',
  },
  { key: 'lateralDerecho', label: 'Lateral derecho', hint: 'Perfil completo del lado derecho' },
  { key: 'interior', label: 'Interior', hint: 'Cabina, tablero y asientos' },
  { key: 'motor', label: 'Motor', hint: 'Compartimiento del motor visible' },
  { key: 'chasis', label: 'Chasis', hint: 'Número o zona identificable del chasis' },
];

const PHOTO_SLOTS_MOTORCYCLE: readonly PhotoSlot[] = [
  { key: 'frontal', label: 'Frontal', hint: 'Vista completa desde el frente' },
  { key: 'trasero', label: 'Trasero', hint: 'Vista completa desde atrás' },
  {
    key: 'lateralIzquierdo',
    label: 'Lateral izquierdo',
    hint: 'Perfil completo del lado izquierdo',
  },
  { key: 'lateralDerecho', label: 'Lateral derecho', hint: 'Perfil completo del lado derecho' },
  { key: 'motor', label: 'Motor', hint: 'Motor y zona mecánica principal' },
];

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const PHOTO_MAX_SIDE = 900;
const PHOTO_QUALITY = 0.72;

/** Redimensiona y comprime la imagen al vuelo (`prototipo/js/app.js:537-561`), igual que el
 * prototipo — ahí tampoco viaja al backend: sólo vive en memoria del navegador. */
function optimizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la fotografía'));
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
      };
      image.onerror = () => reject(new Error('No se pudo leer la imagen'));
      image.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Alta y edición de vehículo (spec 001, RF-01/RF-03/RF-04). Placa y tipo son
 * los únicos campos obligatorios; el resto se completa cuando se conoce.
 * Sin librería de formularios (no está aprobada en este proyecto): estado
 * en un signal simple, igual que el resto de la feature.
 *
 * El registro fotográfico (sección 02) reproduce la UI del prototipo, pero el spec 001 lo deja
 * fuera de alcance ("Subida de fotos del vehículo") y el backend no tiene mutación para
 * persistirlas: las fotos viven sólo en memoria mientras el formulario está abierto, igual que en
 * el prototipo (que tampoco las envía a un backend real).
 */
@Component({
  imports: [...FORM_MODAL_IMPORTS, IconComponent],
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

  protected readonly photos = signal<Record<string, string>>({});
  protected readonly photoSlots = computed(() =>
    this.form().type === 'MOTOCICLETA' ? PHOTO_SLOTS_MOTORCYCLE : PHOTO_SLOTS_VEHICLE,
  );
  protected readonly photosCompleted = computed(
    () => this.photoSlots().filter((slot) => this.photos()[slot.key]).length,
  );
  protected readonly photoHelp = computed(() =>
    this.form().type === 'MOTOCICLETA'
      ? 'Motocicleta: 5 fotografías obligatorias — frontal, trasero, ambos laterales y motor.'
      : 'Vehículo: 7 fotografías obligatorias — frontal, trasero, ambos laterales, interior, motor y chasis.',
  );

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly toast: ToastService,
  ) {
    // `input()` no garantiza el valor real del padre en el inicializador de
    // campo (sólo el default); un `effect` sí reacciona de forma fiable
    // cuando el padre pasa un vehículo (modo edición).
    effect(() => {
      this.form.set(this.initialValue());
    });
  }

  protected async onPhotoSelected(key: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.show('Seleccione un archivo de imagen válido.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.toast.show('La fotografía no debe superar 12 MB.');
      return;
    }

    try {
      const dataUrl = await optimizePhoto(file);
      this.photos.update((current) => ({ ...current, [key]: dataUrl }));
    } catch {
      this.toast.show('No se pudo procesar la fotografía.');
    }
  }

  protected removePhoto(key: string): void {
    this.photos.update((current) => {
      const { [key]: _removed, ...rest } = current;
      return rest;
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
