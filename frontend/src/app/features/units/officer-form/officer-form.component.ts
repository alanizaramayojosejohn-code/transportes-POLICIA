import { Component, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { OfficersService } from '../officers.service';
import { UnitsService } from '../units.service';
import { CreateOfficerInput, Officer, UnitOption } from '../unit.model';

/** Alta y edición de personal policial (spec 002, RF-13/RF-15). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-officer-form',
  templateUrl: './officer-form.component.html',
})
export class OfficerFormComponent {
  readonly officer = input<Officer | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly units: () => UnitOption[];
  protected readonly form = signal<CreateOfficerInput>({ ci: '', firstName: '', lastName: '' });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly officersService: OfficersService,
    private readonly unitsService: UnitsService,
  ) {
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });

    effect(() => {
      const officer = this.officer();
      this.form.set(
        officer
          ? {
              ci: officer.ci,
              ciComplement: officer.ciComplement || undefined,
              firstName: officer.firstName,
              lastName: officer.lastName,
              rank: officer.rank ?? undefined,
              phone: officer.phone ?? undefined,
              email: officer.email ?? undefined,
              currentUnitId: officer.currentUnit?.id,
            }
          : { ci: '', firstName: '', lastName: '' },
      );
    });
  }

  protected get isEdit(): boolean {
    return this.officer() !== null;
  }

  protected patch(partial: Partial<CreateOfficerInput>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!value.ci.trim() || !value.firstName.trim() || !value.lastName.trim()) {
      this.errorMessage.set('La cédula, los nombres y los apellidos son obligatorios.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const current = this.officer();
      if (current) {
        await this.officersService.update(current.id, value);
      } else {
        await this.officersService.create(value);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el registro.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
