import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableEmptyRowComponent } from './table-empty-row.component';

@Component({
  imports: [TableEmptyRowComponent],
  template: `<table>
    <tbody>
      <tr appTableEmpty [colspan]="4" [loading]="loading()">
        Sin recorridos registrados todavía.
      </tr>
    </tbody>
  </table>`,
})
class HostComponent {
  readonly loading = signal(false);
}

function setup(loading: boolean) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.loading.set(loading);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    cell: () => el.querySelector('td'),
  };
}

describe('TableEmptyRowComponent', () => {
  it('sin carga en curso muestra el mensaje de estado vacío', () => {
    const { text } = setup(false);

    expect(text()).toContain('Sin recorridos registrados todavía.');
    expect(text()).not.toContain('Cargando');
  });

  /// El bug que motivó el indicador: con `cache-and-network`, la primera pintura no tiene datos
  /// y anunciaba «no hay nada» antes de que llegara la respuesta.
  it('mientras carga oculta el mensaje y muestra el indicador', () => {
    const { text } = setup(true);

    expect(text()).not.toContain('Sin recorridos registrados todavía.');
    expect(text()).toContain('Cargando');
  });

  it('cambia de indicador a mensaje cuando termina la carga', () => {
    const { fixture, host, text } = setup(true);

    host.loading.set(false);
    fixture.detectChanges();

    expect(text()).toContain('Sin recorridos registrados todavía.');
  });

  it('respeta el colspan para que la fila ocupe toda la tabla', () => {
    const { cell } = setup(false);

    expect(cell()?.getAttribute('colspan')).toBe('4');
  });
});
