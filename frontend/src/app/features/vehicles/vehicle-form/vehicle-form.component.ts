import {
  Component,
  computed,
  effect,
  input,
  output,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { VehiclesService } from '../vehicles.service';
import { CreateVehicleInput, VEHICLE_TYPE_LABEL, Vehicle, VehicleType } from '../vehicle.model';
import { VehiclePhotosService } from '../vehicle-photos.service';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { errorMessage } from '../../../shared/error-message';
import { CurrentRoleService } from '../../../core/current-role.service';
import { UnitsService } from '../../units/units.service';
import { UnitOption } from '../../units/unit.model';
import { UnitAssignmentsService } from '../../unit-assignments/unit-assignments.service';
import { ProcedureChecklistFieldsComponent } from '../../../shared/procedure-checklist/procedure-checklist-fields.component';
import { toDateInputValue } from '../../../shared/date-format';
import { FormValidation } from '../../../shared/validation/form-validation';
import { combine, max, maxLength, min, required } from '../../../shared/validation/validators';

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
 * El registro fotográfico (sección 02) reproduce la UI del prototipo. El spec 001 lo deja fuera de
 * alcance ("Subida de fotos del vehículo"), pero se persiste igual (módulo `vehicle-photos`, sin
 * spec propio): cada foto es un data URL guardado en la misma base, upsert por (vehicleId,
 * slotKey). Igual que el resto del formulario, sólo se sincroniza con el backend al enviar
 * (`submit`), no foto por foto — cancelar el modal no deja cambios sueltos.
 *
 * Alta con unidad (spec 015, RF-12): `createVehicle` no acepta `unitId` (spec 001 no lo pide) y un
 * TRANSPORTES sólo ve vehículos con asignación vigente a alguna de sus unidades. Sin este paso, un
 * vehículo recién creado por un TRANSPORTES quedaría huérfano — invisible en todo listado propio,
 * incluido el selector de vehículo de «Asignaciones» (mismo filtro), sin forma de asignarlo
 * después. Por eso, al crear (nunca al editar), si el rol es TRANSPORTES este formulario también
 * llama a `createUnitAssignment` con la unidad a su cargo — la única unidad si tiene una sola, o la
 * que elija si tiene varias — encadenado tras `createVehicle`.
 */
@Component({
  imports: [...FORM_MODAL_IMPORTS, IconComponent, ProcedureChecklistFieldsComponent],
  selector: 'app-vehicle-form',
  templateUrl: './vehicle-form.component.html',
})
export class VehicleFormComponent {
  readonly vehicle = input<Vehicle | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly checklistFields = viewChild(ProcedureChecklistFieldsComponent);

  protected readonly types: VehicleType[] = [
    'CAMIONETA',
    'AUTOMOVIL',
    'MOTOCICLETA',
    'MINIBUS',
    'CAMION',
    'CAMION_CISTERNA',
    'CAMION_GRUA',
    'CAMION_BOMBERO',
    'CAMION_RESCATE',
    'CUADRATRACK',
    'FURGON',
    'AMBULANCIA',
    'OTRO',
  ];
  protected readonly typeLabels = VEHICLE_TYPE_LABEL;

  protected readonly form = signal<CreateVehicleInput>({ plate: '', type: 'CAMIONETA' });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly validation = new FormValidation(this.form, {
    plate: combine(
      required<string, CreateVehicleInput>('La placa es obligatoria.'),
      maxLength<CreateVehicleInput>(20, 'La placa no puede superar los 20 caracteres.'),
    ),
    type: required('Seleccione el tipo de vehículo.'),
    year: combine(
      min<CreateVehicleInput>(1900, 'El año no puede ser anterior a 1900.'),
      max<CreateVehicleInput>(2200, 'El año no puede ser posterior a 2200.'),
    ),
  });

  protected readonly isTransportes: boolean;
  protected readonly units: Signal<UnitOption[]>;
  protected readonly selectedUnitId = signal('');

  protected readonly photos = signal<Record<string, string>>({});
  /// Snapshot de lo que ya está guardado (modo edición), para saber en
  /// `submit` qué slots hay que borrar (los que estaban y ya no están).
  private readonly initialPhotos = signal<Record<string, string>>({});
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
    private readonly vehiclePhotosService: VehiclePhotosService,
    private readonly toast: ToastService,
    private readonly currentRole: CurrentRoleService,
    private readonly unitsService: UnitsService,
    private readonly unitAssignmentsService: UnitAssignmentsService,
  ) {
    // `input()` no garantiza el valor real del padre en el inicializador de
    // campo (sólo el default); un `effect` sí reacciona de forma fiable
    // cuando el padre pasa un vehículo (modo edición).
    effect(() => {
      this.form.set(this.initialValue());
    });

    effect(() => {
      const vehicle = this.vehicle();
      if (vehicle) {
        this.loadPhotos(vehicle.id);
      } else {
        this.photos.set({});
        this.initialPhotos.set({});
      }
    });

    this.isTransportes = this.currentRole.role() === 'TRANSPORTES';
    // Ya viene acotada por el backend (`unitScopeFor`): para TRANSPORTES son
    // sólo sus unidades a cargo, nunca todo el catálogo.
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });

    effect(() => {
      const units = this.units();
      if (this.isTransportes && !this.isEdit && units.length === 1 && !this.selectedUnitId()) {
        this.selectedUnitId.set(units[0].id);
      }
    });
  }

  protected async onPhotoSelected(key: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Seleccione un archivo de imagen válido.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.toast.error('La fotografía no debe superar 12 MB.');
      return;
    }

    try {
      const dataUrl = await optimizePhoto(file);
      this.photos.update((current) => ({ ...current, [key]: dataUrl }));
    } catch {
      this.toast.error('No se pudo procesar la fotografía.');
    }
  }

  protected removePhoto(key: string): void {
    this.photos.update((current) => {
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  }

  private async loadPhotos(vehicleId: string): Promise<void> {
    const list = await firstValueFrom(this.vehiclePhotosService.list(vehicleId));
    const record = Object.fromEntries(list.map((photo) => [photo.slotKey, photo.dataUrl]));
    this.photos.set(record);
    this.initialPhotos.set(record);
  }

  /// Sólo escribe lo que cambió respecto al snapshot cargado: evita
  /// reenviar de vuelta al backend fotos que ya estaban y no se tocaron.
  private async persistPhotos(vehicleId: string): Promise<void> {
    const current = this.photos();
    const initial = this.initialPhotos();
    const keys = new Set([...Object.keys(current), ...Object.keys(initial)]);
    for (const key of keys) {
      const value = current[key];
      if (value && value !== initial[key]) {
        await this.vehiclePhotosService.set({ vehicleId, slotKey: key, dataUrl: value });
      } else if (!value && initial[key]) {
        await this.vehiclePhotosService.remove(vehicleId, key);
      }
    }
  }

  protected get isEdit(): boolean {
    return this.vehicle() !== null;
  }

  protected patch(partial: Partial<CreateVehicleInput>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!this.validation.validateAll()) {
      return;
    }
    if (!this.isEdit && this.isTransportes && !this.selectedUnitId()) {
      this.errorMessage.set(
        this.units().length === 0
          ? 'No es encargado vigente de ninguna unidad: no puede registrar vehículos hasta que se le designe una.'
          : 'Seleccione la unidad a la que pertenece el vehículo.',
      );
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const current = this.vehicle();
      if (current) {
        await this.vehiclesService.update(current.id, value);
        try {
          await this.persistPhotos(current.id);
        } catch (photoError) {
          this.partialFailure(
            'Los datos del vehículo se guardaron, pero no se pudieron actualizar las fotografías',
            photoError,
          );
          return;
        }
      } else {
        const created = await this.vehiclesService.create({
          ...value,
          checklistItems: this.checklistFields()?.items(),
        });
        try {
          await this.persistPhotos(created.id);
        } catch (photoError) {
          this.partialFailure(
            'El vehículo se registró, pero no se pudieron guardar las fotografías',
            photoError,
          );
          return;
        }
        if (this.isTransportes) {
          try {
            await this.unitAssignmentsService.create({
              vehicleId: created.id,
              unitId: this.selectedUnitId(),
              startDate: toDateInputValue(),
            });
          } catch (assignError) {
            this.partialFailure(
              'El vehículo se registró, pero no se pudo asignar a la unidad automáticamente',
              assignError,
              'Pida a un administrador que lo asigne desde Asignaciones.',
            );
            return;
          }
        }
      }
      this.toast.success(
        current ? `Vehículo ${value.plate} actualizado.` : `Vehículo ${value.plate} registrado.`,
      );
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo guardar el vehículo.'));
    } finally {
      this.submitting.set(false);
    }
  }

  /// El vehículo sí quedó guardado y falló un paso posterior (fotos, asignación de unidad): el
  /// aviso lo dice así, porque reintentar el alta completa duplicaría el registro.
  private partialFailure(summary: string, cause: unknown, advice = ''): void {
    const message = `${summary} (${errorMessage(cause, 'error desconocido')}).${advice ? ` ${advice}` : ''}`;
    this.errorMessage.set(message);
    this.toast.error(message);
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
