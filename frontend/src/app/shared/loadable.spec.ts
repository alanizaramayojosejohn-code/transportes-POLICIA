import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Loadable, loadable, loadableOf } from './loadable';

interface Page {
  items: string[];
}

const EMPTY: Page = { items: [] };

/// `loadable` usa `toObservable`/`toSignal`, que necesitan contexto de inyección y propagan
/// valores en la detección de cambios: se prueba desde un componente anfitrión, no suelto.
@Component({ template: '' })
class HostComponent {
  readonly filter = signal('a');
  readonly sources = new Map<string, Subject<Page>>();

  readonly result: Loadable<Page> = loadable(
    this.filter,
    (filter) => {
      const source = new Subject<Page>();
      this.sources.set(filter, source);
      return source;
    },
    EMPTY,
  );
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.componentInstance;
  return {
    fixture,
    host,
    emit: (filter: string, page: Page) => {
      host.sources.get(filter)!.next(page);
      fixture.detectChanges();
    },
  };
}

describe('loadable', () => {
  it('arranca cargando y con el valor inicial', () => {
    const { host } = setup();

    expect(host.result.loading()).toBe(true);
    expect(host.result.value()).toEqual(EMPTY);
  });

  it('deja de cargar al llegar la respuesta', () => {
    const { host, emit } = setup();

    emit('a', { items: ['uno'] });

    expect(host.result.loading()).toBe(false);
    expect(host.result.value()).toEqual({ items: ['uno'] });
  });

  /// Lo que evita que la tabla parpadee vacía al cambiar de página o de filtro: mientras la
  /// consulta nueva viaja, la vista sigue mostrando lo anterior con el indicador encendido.
  it('conserva los datos previos mientras recarga por un filtro nuevo', () => {
    const { fixture, host, emit } = setup();
    emit('a', { items: ['uno'] });

    host.filter.set('b');
    fixture.detectChanges();

    expect(host.result.loading()).toBe(true);
    expect(host.result.value()).toEqual({ items: ['uno'] });

    emit('b', { items: ['dos'] });

    expect(host.result.loading()).toBe(false);
    expect(host.result.value()).toEqual({ items: ['dos'] });
  });

  it('sigue emitiendo las actualizaciones posteriores de la misma consulta', () => {
    const { host, emit } = setup();

    emit('a', { items: ['uno'] });
    emit('a', { items: ['uno', 'dos'] });

    expect(host.result.value()).toEqual({ items: ['uno', 'dos'] });
    expect(host.result.loading()).toBe(false);
  });
});

@Component({ template: '' })
class OnceHostComponent {
  readonly source = new Subject<Page>();
  readonly result: Loadable<Page> = loadableOf(this.source, EMPTY);
}

describe('loadableOf', () => {
  it('arranca cargando y se apaga con la primera respuesta', () => {
    const fixture = TestBed.createComponent(OnceHostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;

    expect(host.result.loading()).toBe(true);
    expect(host.result.value()).toEqual(EMPTY);

    host.source.next({ items: ['uno'] });
    fixture.detectChanges();

    expect(host.result.loading()).toBe(false);
    expect(host.result.value()).toEqual({ items: ['uno'] });
  });
});
