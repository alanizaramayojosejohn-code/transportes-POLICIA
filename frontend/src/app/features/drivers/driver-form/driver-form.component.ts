import { Component, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { DriversService } from '../drivers.service';
import { CreateDriverInput, Driver } from '../driver.model';
import { UnitOption } from '../../units/unit.model';
import { UnitsService } from '../../units/units.service';

interface DriverFormState {
  firstName: string;
  lastName: string;
  ci: string;
  rank: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiresAt: string;
  phone: string;
  unitId: string;
}

const EMPTY_FORM: DriverFormState = {
  firstName: '',
  lastName: '',
  ci: '',
  rank: '',
  licenseNumber: '',
  licenseCategory: '',
  licenseExpiresAt: '',
  phone: '',
  unitId: '',
};

/** Alta y edición de conductores (spec 005, RF-1/RF-5). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-driver-form',
  templateUrl: './driver-form.component.html',
})
export class DriverFormComponent {
  readonly driver = input<Driver | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly units: () => UnitOption[];
  protected readonly form = signal<DriverFormState>(EMPTY_FORM);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly driversService: DriversService,
    private readonly unitsService: UnitsService,
  ) {
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });

    effect(() => {
      const driver = this.driver();
      this.form.set(
        driver
          ? {
              firstName: driver.firstName,
              lastName: driver.lastName,
              ci: driver.ci,
              rank: driver.rank ?? '',
              licenseNumber: driver.licenseNumber,
              licenseCategory: driver.licenseCategory,
              licenseExpiresAt: driver.licenseExpiresAt.slice(0, 10),
              phone: driver.phone ?? '',
              unitId: driver.unitId ?? '',
            }
          : EMPTY_FORM,
      );
    });
  }

  protected get isEdit(): boolean {
    return this.driver() !== null;
  }

  protected patch(partial: Partial<DriverFormState>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (
      !value.firstName.trim() ||
      !value.lastName.trim() ||
      !value.ci.trim() ||
      !value.licenseNumber.trim() ||
      !value.licenseCategory.trim() ||
      !value.licenseExpiresAt
    ) {
      this.errorMessage.set(
        'CI, nombres, apellidos, licencia, categoría y vencimiento son obligatorios.',
      );
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const payload: CreateDriverInput = {
        firstName: value.firstName,
        lastName: value.lastName,
        ci: value.ci,
        rank: value.rank || undefined,
        licenseNumber: value.licenseNumber,
        licenseCategory: value.licenseCategory,
        licenseExpiresAt: value.licenseExpiresAt,
        phone: value.phone || undefined,
        unitId: value.unitId || undefined,
      };
      const current = this.driver();
      if (current) {
        await this.driversService.update(current.id, payload);
      } else {
        await this.driversService.create(payload);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el conductor.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
