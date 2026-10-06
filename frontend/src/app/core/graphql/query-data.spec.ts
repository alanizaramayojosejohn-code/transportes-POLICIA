import { Subject, firstValueFrom, toArray } from 'rxjs';
import { queryData } from './query-data';

interface TripsResult {
  trips: { items: string[]; total: number };
}

const EMPTY = { items: [] as string[], total: 0 };

/// Emisiones tal como las entrega `watchQuery().valueChanges` de Apollo v4.
const loadingWithoutData = { loading: true, data: undefined };
const loaded = (total: number) => ({
  loading: false,
  data: { trips: { items: ['a'], total } } satisfies TripsResult,
});

function collect(source: Subject<{ loading: boolean; data?: unknown }>) {
  return firstValueFrom(
    source.pipe(
      queryData((data: TripsResult) => data.trips, EMPTY),
      toArray(),
    ),
  );
}

describe('queryData', () => {
  it('descarta la emisión de carga sin datos y sólo entrega la respuesta', async () => {
    const source = new Subject<{ loading: boolean; data?: unknown }>();
    const emitted = collect(source);

    source.next(loadingWithoutData);
    source.next(loaded(3));
    source.complete();

    expect(await emitted).toEqual([{ items: ['a'], total: 3 }]);
  });

  /// El motivo de existir del operador: sin él, la emisión de carga se mapeaba al valor por
  /// defecto y la pantalla mostraba «Sin registros» un instante antes de saltar a los datos.
  it('nunca emite el valor por defecto mientras la consulta está en vuelo', async () => {
    const source = new Subject<{ loading: boolean; data?: unknown }>();
    const emitted = collect(source);

    source.next(loadingWithoutData);
    source.complete();

    expect(await emitted).toEqual([]);
  });

  it('sí emite si llega una recarga con datos ya en caché (loading con data)', async () => {
    const source = new Subject<{ loading: boolean; data?: unknown }>();
    const emitted = collect(source);

    source.next({ loading: true, data: { trips: { items: ['a'], total: 1 } } });
    source.next(loaded(2));
    source.complete();

    expect(await emitted).toEqual([
      { items: ['a'], total: 1 },
      { items: ['a'], total: 2 },
    ]);
  });

  /// Una consulta que termina en error entrega `{ loading: false, data: undefined }`: ahí sí
  /// corresponde vaciar la vista en vez de dejar datos viejos en pantalla.
  it('cae al valor por defecto cuando la consulta termina sin datos', async () => {
    const source = new Subject<{ loading: boolean; data?: unknown }>();
    const emitted = collect(source);

    source.next({ loading: false, data: undefined });
    source.complete();

    expect(await emitted).toEqual([EMPTY]);
  });

  it('cae al valor por defecto si el campo pedido no vino en la respuesta', async () => {
    const source = new Subject<{ loading: boolean; data?: unknown }>();
    const emitted = collect(source);

    source.next({ loading: false, data: {} });
    source.complete();

    expect(await emitted).toEqual([EMPTY]);
  });
});
