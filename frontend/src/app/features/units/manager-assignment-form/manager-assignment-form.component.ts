import { Component, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { UnitsService } from '../units.service';
import { OfficerOption, OfficersService } from '../officers.service';

/** Designa al encargado de transportes de una unidad (spec 002, RF-18 a RF-22). */
@Component({
  imports: [ModalComponent],
  selector: 'app-manager-assignment-form',
  templateUrl: './manager-assignment-form.component.html',
})
export class ManagerAssignmentFormComponent {
  readonly unitId = input.required<string>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly officers: () => OfficerOption[];

  protected readonly officerId = signal('');
  protected readonly startDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly referenceDocument = signal('');
  protected readonly notes = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly unitsService: UnitsService,
    private readonly officersService: OfficersService,
  ) {
    this.officers = toSignal(this.officersService.listActiveOptions(), { initialValue: [] });
  }

  protected async submit(): Promise<void> {
    if (!this.officerId()) {
      this.errorMessage.set('Debe seleccionar a la persona designada.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.unitsService.assignTransportManager({
        unitId: this.unitId(),
        officerId: this.officerId(),
        startDate: this.startDate(),
        referenceDocument: this.referenceDocument() || undefined,
        notes: this.notes() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar la designación.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
