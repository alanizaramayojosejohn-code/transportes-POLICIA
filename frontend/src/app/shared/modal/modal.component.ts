import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal genérico (fondo + panel centrado): usado por los formularios de alta/edición y por las
 * fichas de detalle de sólo lectura. `eyebrow`/`description` reproducen la cabecera extendida del
 * modal de vehículo (`prototipo/index.html:4267-4273`); el resto la omite. `wide` reproduce
 * `.vehicle-modal-box { max-width: 980px }`; `small` reproduce `.modal-small { max-width: 620px }`,
 * el ancho de las ~10 fichas de detalle del prototipo (conductor, recorrido, combustible...) —
 * más angosto que el modal por defecto (680px). */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>();
  readonly description = input<string>();
  readonly wide = input(false, { transform: booleanAttribute });
  readonly small = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly previousBodyOverflow = document.body.style.overflow;

  constructor() {
    document.body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = this.previousBodyOverflow;
    });
    afterNextRender(() => this.panel()?.nativeElement.focus());
  }

  protected onBackdropClick(): void {
    this.closed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closed.emit();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  /** Ciclo simple de foco: Tab en el último foco vuelve al primero y viceversa. */
  private trapFocus(event: KeyboardEvent): void {
    const panel = this.panel()?.nativeElement;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
