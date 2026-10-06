import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { PaginationComponent } from './pagination.component';

/// Anfitrión mínimo: el componente sólo expone entradas y una salida, así que se prueba desde
/// fuera (texto renderizado + botones) en vez de tocar sus miembros protegidos.
@Component({
  imports: [PaginationComponent],
  template: `<app-pagination
    noun="vehículo(s)"
    [total]="total()"
    [skip]="skip()"
    [pageSize]="pageSize()"
    (skipChange)="skip.set($event)"
  />`,
})
class HostComponent {
  readonly total = signal(0);
  readonly skip = signal(0);
  readonly pageSize = signal(20);
}

function setup(total: number, skip = 0, pageSize = 20) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.total.set(total);
  fixture.componentInstance.skip.set(skip);
  fixture.componentInstance.pageSize.set(pageSize);
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(el.querySelectorAll('button'));
  return {
    fixture,
    host: fixture.componentInstance,
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    prev: () => buttons().find((b) => b.textContent?.includes('Anterior')),
    next: () => buttons().find((b) => b.textContent?.includes('Siguiente')),
  };
}

describe('PaginationComponent', () => {
  it('con una sola página no muestra controles ni número de página', () => {
    const { text, prev, next } = setup(12);

    expect(text()).toContain('12 vehículo(s) en total.');
    expect(text()).not.toContain('Página');
    expect(prev()).toBeUndefined();
    expect(next()).toBeUndefined();
  });

  it('con total exactamente igual al tamaño de página sigue siendo una sola página', () => {
    const { text, next } = setup(20);

    expect(text()).not.toContain('Página');
    expect(next()).toBeUndefined();
  });

  it('con más de una página muestra el total, la página actual y los controles', () => {
    const { text, prev, next } = setup(48);

    expect(text()).toContain('48 vehículo(s) en total.');
    expect(text()).toContain('Página 1 de 3');
    expect(prev()?.disabled).toBe(true);
    expect(next()?.disabled).toBe(false);
  });

  it('avanza y retrocede emitiendo el nuevo skip', () => {
    const { fixture, host, text, prev, next } = setup(48);

    next()?.click();
    fixture.detectChanges();
    expect(host.skip()).toBe(20);
    expect(text()).toContain('Página 2 de 3');

    prev()?.click();
    fixture.detectChanges();
    expect(host.skip()).toBe(0);
    expect(text()).toContain('Página 1 de 3');
  });

  it('en la última página deshabilita «Siguiente»', () => {
    const { text, prev, next } = setup(48, 40);

    expect(text()).toContain('Página 3 de 3');
    expect(prev()?.disabled).toBe(false);
    expect(next()?.disabled).toBe(true);
  });

  it('no emite nada si se fuerza un click en un control deshabilitado', () => {
    const { fixture, host, next } = setup(48, 40);

    next()?.removeAttribute('disabled');
    next()?.click();
    fixture.detectChanges();

    expect(host.skip()).toBe(40);
  });

  it('respeta un tamaño de página distinto (catálogo de trámites usa 50)', () => {
    const { text, next } = setup(120, 0, 50);

    expect(text()).toContain('Página 1 de 3');
    expect(next()?.disabled).toBe(false);
  });

  it('sin resultados muestra 0 y ninguna página extra', () => {
    const { text, next } = setup(0);

    expect(text()).toContain('0 vehículo(s) en total.');
    expect(next()).toBeUndefined();
  });

  /// Si el total baja por un filtro más estrecho antes de que el listado reinicie `skip`, el
  /// número de página no debe pasarse del final.
  it('acota la página actual al total de páginas si el skip quedó fuera de rango', () => {
    const { text } = setup(10, 80);

    expect(text()).toContain('10 vehículo(s) en total.');
    expect(text()).not.toContain('Página');
  });
});
