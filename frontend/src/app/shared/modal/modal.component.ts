import { Component, input, output } from '@angular/core';

/** Modal genérico (fondo + panel centrado): usado por las tres features de alta. */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected onBackdropClick(): void {
    this.closed.emit();
  }
}
