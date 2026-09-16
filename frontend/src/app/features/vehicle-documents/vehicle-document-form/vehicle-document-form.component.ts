import { Component, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { VehicleDocumentsService } from '../vehicle-documents.service';
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPES, DocumentType } from '../vehicle-document.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';

/** Registro de un documento en el expediente vehicular (spec 010, RF-1). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-vehicle-document-form',
  templateUrl: './vehicle-document-form.component.html',
})
export class VehicleDocumentFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly types = DOCUMENT_TYPES;
  protected readonly typeLabel = DOCUMENT_TYPE_LABEL;
  protected readonly vehicles: () => VehicleOption[];

  protected readonly vehicleId = signal('');
  protected readonly type = signal<DocumentType>('SOAT');
  protected readonly documentNumber = signal('');
  protected readonly issuedAt = signal('');
  protected readonly expiresAt = signal('');
  protected readonly notes = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly vehicleDocumentsService: VehicleDocumentsService,
    private readonly vehiclesService: VehiclesService,
  ) {
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });
  }

  protected async submit(): Promise<void> {
    if (!this.vehicleId() || !this.expiresAt()) {
      this.errorMessage.set('Vehículo, tipo y fecha de vencimiento son obligatorios.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.vehicleDocumentsService.create({
        vehicleId: this.vehicleId(),
        type: this.type(),
        documentNumber: this.documentNumber() || undefined,
        issuedAt: this.issuedAt() || undefined,
        expiresAt: this.expiresAt(),
        notes: this.notes() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar el documento.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
