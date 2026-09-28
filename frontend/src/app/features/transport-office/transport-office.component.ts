import { Component, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { PersonnelService } from '../personnel/personnel.service';
import { PersonnelPage } from '../personnel/personnel.model';
import { TransportOfficeFormComponent } from './transport-office-form/transport-office-form.component';
import { LIST_PAGE_IMPORTS } from '../../shared/list-page.imports';
import { PAGE_SIZE } from '../../shared/pagination/pagination.component';

/** Personal administrativo central y su cuenta (spec 015). Sólo ADMINISTRADOR llega aquí. */
@Component({
  imports: [...LIST_PAGE_IMPORTS, TransportOfficeFormComponent],
  selector: 'app-transport-office',
  templateUrl: './transport-office.component.html',
})
export class TransportOfficeComponent {
  protected readonly page: Signal<PersonnelPage>;

  /// Sin filtros que reiniciar: un `signal` simple basta (no hace falta el
  /// `linkedSignal` que usan los listados con barra de filtros).
  protected readonly skip = signal(0);

  protected readonly showForm = signal(false);
  protected readonly editingPersonId = signal<string | null>(null);

  constructor(private readonly personnelService: PersonnelService) {
    // Se asigna aquí, no como inicializador de campo: un inicializador de
    // campo se ejecuta antes de que la propiedad de parámetro del
    // constructor quede asignada.
    this.page = toSignal(
      toObservable(this.skip).pipe(
        switchMap((skip) => this.personnelService.list({ isAdmin: true, skip, take: PAGE_SIZE })),
      ),
      { initialValue: { items: [], total: 0 } },
    );
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingPersonId.set(null);
  }

  protected edit(id: string): void {
    this.editingPersonId.set(id);
  }

  protected get editingPerson() {
    const id = this.editingPersonId();
    return id ? (this.page().items.find((p) => p.id === id) ?? null) : null;
  }

  protected async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (isActive) {
      await this.personnelService.deactivate(id);
    } else {
      await this.personnelService.reactivate(id);
    }
  }
}
