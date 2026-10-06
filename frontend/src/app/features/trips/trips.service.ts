import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom, Observable } from 'rxjs';
import { queryData } from '../../core/graphql/query-data';
import { ConnectivityService } from '../../core/offline/connectivity.service';
import { OfflineCacheService } from '../../core/offline/offline-cache.service';
import { isRetryableError } from '../../core/offline/retryable-error';
import { fetchAllPages } from '../../shared/export/report-export';
import { TripOutboxMeta, TripOutboxService } from './offline/trip-outbox.service';
import { CloseTripInput, CreateTripInput, Trip, TripFilter, TripPage } from './trip.model';
import {
  CLOSE_TRIP_MUTATION,
  CREATE_TRIP_MUTATION,
  TRIPS_QUERY,
  TripsQueryResult,
} from './trips.operations';

/**
 * Resultado de registrar una salida o una llegada. `queued` distingue lo que
 * llegó al servidor de lo que quedó en la cola local (spec 006, RF-13): la
 * pantalla tiene que decirlo de otra manera —«registrada» no es lo mismo que
 * «se enviará al reconectar»— y no puede adivinarlo mirando el estado de la
 * conexión después del hecho.
 */
export type TripSubmission = { queued: false; trip: Trip } | { queued: true };

@Injectable({ providedIn: 'root' })
export class TripsService {
  private readonly connectivity = inject(ConnectivityService);
  private readonly offlineCache = inject(OfflineCacheService);
  private readonly outbox = inject(TripOutboxService);

  constructor(private readonly apollo: Apollo) {}

  list(filter: TripFilter): Observable<TripPage> {
    return this.apollo
      .watchQuery<TripsQueryResult>({
        query: TRIPS_QUERY,
        variables: filter,
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        queryData((data: TripsQueryResult) => data.trips, { items: [], total: 0 }),
      );
  }

  /**
   * Recorrido abierto de un vehículo, o `null` si no tiene ninguno.
   *
   * Guarda copia local (`OfflineCacheService`) porque es el dato del que
   * depende «Mi vehículo» para ofrecer registrar la llegada: un conductor que
   * abre la aplicación sin señal tiene que poder cerrar el recorrido que dejó
   * abierto antes de perderla.
   */
  openTripFor(vehicleId: string): Observable<Trip | null> {
    return this.apollo
      .watchQuery<TripsQueryResult>({
        query: TRIPS_QUERY,
        variables: { vehicleId, open: true, take: 1 },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        this.offlineCache.cachedData(`openTrip.${vehicleId}`),
        queryData((data: TripsQueryResult) => data.trips.items[0] ?? null, null),
      );
  }

  /// Para exportar: todo el resultado filtrado, no sólo la página actual.
  async listAll(filter: Omit<TripFilter, 'skip' | 'take'>): Promise<Trip[]> {
    return fetchAllPages((skip, take) =>
      firstValueFrom(
        this.apollo.query<TripsQueryResult>({
          query: TRIPS_QUERY,
          variables: { ...filter, skip, take },
          fetchPolicy: 'network-only',
        }),
      ).then((result) => result.data?.trips ?? { items: [], total: 0 }),
    );
  }

  /**
   * Registra la salida. Sin conexión —o si el envío falla por transporte—
   * queda en la cola local y se reenvía al reconectar (RF-13/RF-14).
   *
   * Un rechazo del servidor (vehículo con recorrido abierto, conductor
   * inactivo…) **no** se encola: se propaga para que el formulario lo
   * muestre, porque reintentarlo daría el mismo rechazo.
   */
  async create(input: CreateTripInput, meta: TripOutboxMeta): Promise<TripSubmission> {
    if (!this.connectivity.online()) {
      this.outbox.queueDeparture(input, meta);
      return { queued: true };
    }
    try {
      const result = await firstValueFrom(
        this.apollo.mutate<{ createTrip: Trip }>({
          mutation: CREATE_TRIP_MUTATION,
          variables: { input },
          refetchQueries: ['Trips'],
        }),
      );
      return { queued: false, trip: result.data!.createTrip };
    } catch (error) {
      if (!isRetryableError(error)) throw error;
      this.outbox.queueDeparture(input, meta);
      return { queued: true };
    }
  }

  /** Registra la llegada, con la misma política de cola que `create`. */
  async close(id: string, input: CloseTripInput, meta: TripOutboxMeta): Promise<TripSubmission> {
    /// Cerrar una salida que sigue en cola sólo puede encolarse: el
    /// recorrido todavía no existe en el servidor y su id es provisional.
    if (this.outbox.isQueuedTrip(id) || !this.connectivity.online()) {
      this.outbox.queueArrival(id, input, meta);
      return { queued: true };
    }
    try {
      const result = await firstValueFrom(
        this.apollo.mutate<{ closeTrip: Trip }>({
          mutation: CLOSE_TRIP_MUTATION,
          variables: { id, input },
          refetchQueries: ['Trips'],
        }),
      );
      return { queued: false, trip: result.data!.closeTrip };
    } catch (error) {
      if (!isRetryableError(error)) throw error;
      this.outbox.queueArrival(id, input, meta);
      return { queued: true };
    }
  }
}
