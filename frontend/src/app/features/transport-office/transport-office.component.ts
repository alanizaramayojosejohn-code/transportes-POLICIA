import { Component, Signal, inject, signal } from '@angular/core';
import { PersonnelService } from '../personnel/personnel.service';
import { PersonnelPage } from '../personnel/personnel.model';
import { TransportOfficeFormComponent } from './transport-office-form/transport-office-form.component';
import { activationConfirm } from '../../shared/confirm/activation-confirm';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { errorMessage } from '../../shared/error-message';
import { LIST_PAGE_IMPORTS } from '../../shared/list-page.imports';
import { loadable } from '../../shared/loadable';
import { PAGE_SIZE } from '../../shared/pagination/pagination.component';
import { ToastService } from '../../shared/toast/toast.service';

/** Personal administrativo central y su cuenta (spec 015). Sólo ADMINISTRADOR llega aquí. */
@Component({
  imports: [...LIST_PAGE_IMPORTS, TransportOfficeFormComponent],
  selector: 'app-transport-office',
  templateUrl: './transport-office.component.html',
})
export class TransportOfficeComponent {
  protected readonly page: Signal<PersonnelPage>;
  protected readonly loading: Signal<boolean>;

  /// Sin filtros que reiniciar: un `signal` simple basta (no hace falta el
  /// `linkedSignal` que usan los listados con barra de filtros).
  protected readonly skip = signal(0);

  protected readonly showForm = signal(false);
  protected readonly editingPersonId = signal<string | null>(null);

  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  constructor(private readonly personnelService: PersonnelService) {
    // Se asigna aquí, no como inicializador de campo: un inicializador de
    // campo se ejecuta antes de que la propiedad de parámetro del
    // constructor quede asignada.
    const result = loadable(
      this.skip,
      (skip) => this.personnelService.list({ isAdmin: true, skip, take: PAGE_SIZE }),
      { items: [], total: 0 },
    );
    this.page = result.value;
    this.loading = result.loading;
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
    const person = this.page().items.find((p) => p.id === id);
    if (!person) return;

    const name = `${person.firstName} ${person.lastName}`;
    /// Personal y cuenta son registros distintos (spec 015): la baja del personal no toca la
    /// cuenta, y conviene decirlo para que nadie la dé por cerrada también.
    const account = person.userId
      ? '; su cuenta de sistema se da de baja aparte, desde Usuarios'
      : '';

    const confirmed = await this.confirm.ask(
      activationConfirm(isActive, {
        subject: 'al personal',
        name,
        effect: `dejará de figurar como personal activo del área${account}`,
        restoredEffect: 'vuelve a figurar como personal activo del área',
      }),
    );
    if (!confirmed) return;

    try {
      if (isActive) {
        await this.personnelService.deactivate(id);
        this.toast.success(`${name} dado de baja del área de transportes.`);
      } else {
        await this.personnelService.reactivate(id);
        this.toast.success(`${name} reactivado en el área de transportes.`);
      }
    } catch (error) {
      this.toast.error(
        errorMessage(
          error,
          isActive ? 'No se pudo dar de baja al personal.' : 'No se pudo reactivar al personal.',
        ),
      );
    }
  }
}
