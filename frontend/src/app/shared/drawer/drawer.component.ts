import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

/** Panel lateral de detalle (ficha de vehículo, `prototipo/index.html:9549-9568`). */
@Component({
  selector: 'app-drawer',
  templateUrl: './drawer.component.html',
})
export class DrawerComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
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

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closed.emit();
    }
  }
}
