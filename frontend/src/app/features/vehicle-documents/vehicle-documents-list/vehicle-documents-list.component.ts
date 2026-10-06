import { Component, computed, linkedSignal, signal } from '@angular/core';
import { VehicleDocumentsService } from '../vehicle-documents.service';
import {
  DOCUMENT_TYPE_LABEL,
  DOCUMENT_TYPES,
  DocumentType,
  VehicleDocumentFilter,
} from '../vehicle-document.model';
import { VehicleDocumentFormComponent } from '../vehicle-document-form/vehicle-document-form.component';
import { VehicleDocumentDetailComponent } from '../vehicle-document-detail/vehicle-document-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';

/** Expediente documental de vehículos (spec 010). */
@Component({
  imports: [...LIST_PAGE_IMPORTS, VehicleDocumentFormComponent, VehicleDocumentDetailComponent],
  selector: 'app-vehicle-documents-list',
  templateUrl: './vehicle-documents-list.component.html',
})
export class VehicleDocumentsListComponent {
  protected readonly search = signal('');
  protected readonly type = signal<DocumentType | ''>('');
  protected readonly types = DOCUMENT_TYPES;
  protected readonly typeLabel = DOCUMENT_TYPE_LABEL;

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    type: this.type() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<VehicleDocumentFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(
    this.query,
    (filter) => this.vehicleDocumentsService.list(filter),
    {
      items: [],
      total: 0,
    },
  );
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly showForm = signal(false);
  protected readonly formatDate = formatDateEs;

  protected readonly detailDocumentId = signal<string | null>(null);
  protected readonly detailDocument = computed(
    () => this.page().items.find((d) => d.id === this.detailDocumentId()) ?? null,
  );

  constructor(
    private readonly vehicleDocumentsService: VehicleDocumentsService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected closeForm(): void {
    this.showForm.set(false);
  }

  protected isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() < Date.now();
  }
}
