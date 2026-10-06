import { Injectable, inject } from '@angular/core';
import { OperatorFunction, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { QueryResultLike } from '../graphql/query-data';

const PREFIX = 'transportes.offline';

/**
 * Última respuesta conocida de las consultas que una pantalla necesita para
 * poder operar sin conexión.
 *
 * Hace falta porque la caché de Apollo vive en memoria: sobrevive a una
 * navegación, no a una recarga. Un conductor que abre la aplicación ya sin
 * señal no tendría ni su vehículo a cargo ni su recorrido abierto, y sin
 * esos dos datos no hay nada que pueda registrar — ni siquiera con la cola
 * de envíos pendientes funcionando (`TripOutboxService`).
 *
 * El `service-worker` de Angular no cubre este caso: sus `dataGroups` sólo
 * cachean peticiones `GET`, y GraphQL viaja por `POST`.
 *
 * Las claves se acotan al usuario autenticado: un equipo compartido entre
 * dos conductores no debe mostrarle a uno el vehículo del otro.
 */
@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  private readonly auth = inject(AuthService);

  read<T>(key: string): T | null {
    const storageKey = this.keyFor(key);
    if (!storageKey) return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      /// Un valor corrupto (escritura a medias, cambio de formato) no debe
      /// dejar la pantalla inutilizable: se descarta y se sigue sin caché.
      localStorage.removeItem(storageKey);
      return null;
    }
  }

  write(key: string, value: unknown): void {
    const storageKey = this.keyFor(key);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /// Cuota llena o modo privado: la caché es una mejora, no un requisito.
    }
  }

  /**
   * Guarda la respuesta de una consulta y, cuando una consulta posterior
   * falla, devuelve la guardada en su lugar. Va **antes** de `queryData` en
   * el `pipe`, sobre el resultado crudo, porque es lo único que distingue
   * «falló» de «no hay nada»:
   *
   * ```ts
   * .valueChanges.pipe(
   *   this.offlineCache.cachedData('miClave'),
   *   queryData((data: Resultado) => data.campo, porDefecto),
   * )
   * ```
   *
   * Un fallo de red llega como una emisión sin datos (`data: undefined`),
   * no como error del stream — así lo entrega apollo-angular y en eso se
   * apoya `queryData` para vaciar la vista. De ahí que no alcance con un
   * `catchError`: ése sólo cubre el fallo que sí corta el stream.
   *
   * Sin copia guardada el resultado pasa tal cual y la pantalla reporta el
   * fallo como siempre.
   */
  cachedData<T extends QueryResultLike>(key: string): OperatorFunction<T, QueryResultLike> {
    return (source) =>
      source.pipe(
        map((result): QueryResultLike => {
          /// Emisión de carga sin datos: no dice nada todavía; la descarta
          /// `queryData` más adelante.
          if (result.loading && result.data === undefined) return result;
          if (result.data !== undefined) {
            this.write(key, result.data);
            return result;
          }
          const cached = this.read<unknown>(key);
          return cached === null ? result : { data: cached, loading: false };
        }),
        catchError((error: unknown) => {
          const cached = this.read<unknown>(key);
          if (cached === null) throw error;
          return of<QueryResultLike>({ data: cached, loading: false });
        }),
      );
  }

  private keyFor(key: string): string | null {
    const userId = this.auth.currentUser()?.id;
    if (!userId || typeof localStorage === 'undefined') return null;
    return `${PREFIX}.${userId}.${key}`;
  }
}
