import { Component, computed, input, output } from '@angular/core';
import { ButtonDirective } from '../button/button.directive';

/**
 * Filas por página de cualquier listado. Coincide con el `take` por defecto de todos los
 * `*FilterArgs` del backend (que acepta hasta 100) y con el que ya pedían los listados antes de
 * tener paginación real.
 */
export const PAGE_SIZE = 20;

/**
 * Pie de tabla con el total y la navegación por páginas. Sustituye al `footer` de `app-table` en
 * los listados: el backend pagina todas sus consultas (`skip`/`take`), así que un pie que sólo
 * anunciaba el total prometía registros que no había forma de alcanzar.
 *
 * Los controles aparecen sólo si hay más de una página, así un listado corto se ve igual que
 * antes en vez de ganar dos botones permanentemente inertes.
 */
@Component({
  imports: [ButtonDirective],
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly skip = input.required<number>();
  readonly pageSize = input(PAGE_SIZE);
  /** Sustantivo contado, ya con su marca de plural: `"vehículo(s)"`, `"orden(es)"`. */
  readonly noun = input.required<string>();
  readonly skipChange = output<number>();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  /// Acotado a `totalPages`: si el total baja (por un filtro más estrecho) antes de que el
  /// listado reinicie `skip`, el número de página no debe pasarse del final.
  protected readonly currentPage = computed(() =>
    Math.min(this.totalPages(), Math.floor(this.skip() / this.pageSize()) + 1),
  );
  protected readonly canGoPrev = computed(() => this.skip() > 0);
  protected readonly canGoNext = computed(() => this.skip() + this.pageSize() < this.total());

  protected prev(): void {
    if (this.canGoPrev()) {
      this.skipChange.emit(Math.max(0, this.skip() - this.pageSize()));
    }
  }

  protected next(): void {
    if (this.canGoNext()) {
      this.skipChange.emit(this.skip() + this.pageSize());
    }
  }
}
