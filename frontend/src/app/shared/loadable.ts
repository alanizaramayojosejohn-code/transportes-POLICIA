import { Signal, computed } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, map, startWith, switchMap, tap } from 'rxjs';

/** Una consulta vista desde la plantilla: los datos que ya hay y si falta llegar más. */
export interface Loadable<T> {
  /** Últimos datos conocidos; el valor inicial hasta la primera respuesta. */
  readonly value: Signal<T>;
  /** `true` mientras hay una petición en vuelo, incluida la primera. */
  readonly loading: Signal<boolean>;
}

interface State<T> {
  value: T;
  loading: boolean;
}

function split<T>(state: Signal<State<T>>): Loadable<T> {
  return {
    value: computed(() => state().value),
    loading: computed(() => state().loading),
  };
}

/**
 * Consulta derivada de un filtro: cada vez que `source` cambia se vuelve a pedir, marcando
 * `loading` hasta que llega la respuesta. Los datos anteriores se conservan mientras tanto, así
 * un cambio de página o de filtro no vacía la tabla antes de tener con qué rellenarla.
 *
 * Debe llamarse en contexto de inyección (inicializador de campo o constructor).
 */
export function loadable<S, T>(
  source: Signal<S>,
  load: (value: S) => Observable<T>,
  initialValue: T,
): Loadable<T> {
  let last = initialValue;
  const state = toSignal(
    toObservable(source).pipe(
      switchMap((value) =>
        load(value).pipe(
          tap((result) => {
            last = result;
          }),
          map((result): State<T> => ({ value: result, loading: false })),
          /// Se evalúa al proyectar cada consulta, así que arranca con lo último que se vio.
          startWith({ value: last, loading: true }),
        ),
      ),
    ),
    { initialValue: { value: initialValue, loading: true } },
  );
  return split(state);
}

/** Variante para una consulta sin filtro: se pide una vez y se escucha su stream. */
export function loadableOf<T>(source$: Observable<T>, initialValue: T): Loadable<T> {
  const state = toSignal(source$.pipe(map((value): State<T> => ({ value, loading: false }))), {
    initialValue: { value: initialValue, loading: true },
  });
  return split(state);
}
