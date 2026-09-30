import { OperatorFunction, filter, map } from 'rxjs';

/**
 * Lo que este operador necesita de un `ApolloQueryResult`. `data` va como `unknown` a propósito:
 * Apollo Client v4 tipa ese campo como una unión (completo / parcial / ausente) según el
 * `dataState`, y ninguna firma genérica acepta las tres ramas a la vez. El tipo real lo aporta
 * el `select` de cada llamada, anotando su parámetro.
 */
interface QueryResultLike {
  data?: unknown;
  loading: boolean;
}

/**
 * Normaliza el `valueChanges` de un `watchQuery`: extrae el campo de la respuesta y **descarta
 * las emisiones de carga sin datos**.
 *
 * Con `fetchPolicy: 'cache-and-network'` Apollo emite primero `{ loading: true, data: undefined }`
 * y sólo después la respuesta. Mapear esa primera emisión al valor por defecto hacía que cada
 * pantalla mostrara un listado vacío («Sin recorridos registrados…») durante un instante antes
 * de saltar a los datos. Saltándola, la vista se queda en su valor previo y el indicador de
 * carga (`loadable()`) es lo único que se ve mientras llega la respuesta.
 *
 * El valor por defecto sigue haciendo falta: una consulta que termina en error entrega
 * `{ loading: false, data: undefined }` y ahí sí corresponde vaciar la vista.
 *
 * El parámetro de `select` **debe ir anotado** — de ahí sale el tipo de la respuesta:
 * `queryData((data: TripsQueryResult) => data.trips, { items: [], total: 0 })`.
 */
export function queryData<TData, TResult>(
  select: (data: TData) => TResult | null | undefined,
  fallback: TResult,
): OperatorFunction<QueryResultLike, TResult> {
  return (source) =>
    source.pipe(
      filter((result) => !result.loading || result.data !== undefined),
      map((result) =>
        result.data === undefined ? fallback : (select(result.data as TData) ?? fallback),
      ),
    );
}
