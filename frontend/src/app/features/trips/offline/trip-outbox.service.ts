import {
  Injectable,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { ConnectivityService } from '../../../core/offline/connectivity.service';
import { OfflineCacheService } from '../../../core/offline/offline-cache.service';
import { isRetryableError } from '../../../core/offline/retryable-error';
import { errorMessage } from '../../../shared/error-message';
import { CloseTripInput, CreateTripInput, Trip } from '../trip.model';
import { CLOSE_TRIP_MUTATION, CREATE_TRIP_MUTATION } from '../trips.operations';

const CACHE_KEY = 'tripOutbox';

/** Prefijo de los ids provisionales, para distinguirlos de un uuid del servidor. */
const LOCAL_PREFIX = 'local:';

/** Datos que la cola necesita para poder mostrar el registro pendiente sin consultar al servidor. */
export interface TripOutboxMeta {
  vehiclePlate: string;
  /** Nombre completo de quien conduce; sólo para el texto del pendiente. */
  driverName: string;
}

interface TripOutboxEntryBase {
  /** Id local. En una salida hace además de id provisional del recorrido. */
  id: string;
  /** Momento en que el usuario lo registró, no en que se envió. */
  createdAt: string;
  meta: TripOutboxMeta;
  /** Motivo del rechazo del servidor. Presente ⇒ no se reintenta solo. */
  error?: string;
}

export interface TripDepartureEntry extends TripOutboxEntryBase {
  kind: 'departure';
  input: CreateTripInput;
}

export interface TripArrivalEntry extends TripOutboxEntryBase {
  kind: 'arrival';
  /** Id del recorrido en el servidor, o el id local de una salida todavía en cola. */
  tripId: string;
  input: CloseTripInput;
}

export type TripOutboxEntry = TripDepartureEntry | TripArrivalEntry;

/**
 * Cola de salidas y llegadas registradas sin conexión (spec 006, RF-13 a
 * RF-17).
 *
 * El caso real es un conductor en ruta, fuera de cobertura, que tiene que
 * dejar constancia de la salida al arrancar y de la llegada al volver. Antes
 * la mutación simplemente fallaba y el registro se perdía. Ahora queda en
 * `localStorage` —sobrevive a cerrar la aplicación y a apagar el equipo— y
 * se reenvía en orden en cuanto hay red.
 *
 * Decisiones que vale la pena no re-descubrir:
 *
 * - **El orden importa.** Una llegada puede referirse a una salida que
 *   tampoco se envió todavía; en ese caso guarda el id local de la salida y,
 *   al enviarse ésta, se reescribe con el id real (`rebindArrivals`). Si un
 *   envío falla por red, el resto se queda en cola: adelantarse rompería esa
 *   cadena.
 * - **Un rechazo del servidor no se reintenta** (`isRetryableError`): queda
 *   marcado con su motivo para que el usuario decida, porque reintentar algo
 *   que el servidor ya rechazó no cambia de resultado y taparía el aviso.
 * - **La cola es de un usuario, no del equipo**: las claves las acota
 *   `OfflineCacheService` por usuario autenticado, y `linkedSignal` la vuelve
 *   a leer si cambia la sesión en la misma pestaña — así lo que registró un
 *   conductor nunca se envía en nombre de otro.
 */
@Injectable({ providedIn: 'root' })
export class TripOutboxService {
  private readonly apollo = inject(Apollo);
  private readonly auth = inject(AuthService);
  private readonly cache = inject(OfflineCacheService);
  private readonly connectivity = inject(ConnectivityService);

  /// Se reinicia al cambiar de usuario: `source` es el id de sesión y la
  /// `computation` vuelve a leer la cola ya acotada a ese usuario.
  private readonly store = linkedSignal<string | null, readonly TripOutboxEntry[]>({
    source: () => this.auth.currentUser()?.id ?? null,
    computation: () => this.cache.read<TripOutboxEntry[]>(CACHE_KEY) ?? [],
  });

  readonly entries = this.store.asReadonly();

  /** Pendientes de envío: los que todavía pueden salir solos. */
  readonly pending = computed(() => this.entries().filter((entry) => !entry.error));

  /** Rechazados por el servidor: necesitan que el usuario reintente o descarte. */
  readonly failed = computed(() => this.entries().filter((entry) => entry.error));

  private readonly flushingState = signal(false);
  readonly flushing = this.flushingState.asReadonly();

  /**
   * Marca de tiempo del último envío con éxito. Las pantallas la usan como
   * fuente de recarga: lo que estaban mostrando quedó viejo en ese instante.
   */
  private readonly flushedAtState = signal(0);
  readonly flushedAt = this.flushedAtState.asReadonly();

  /**
   * Salidas en cola vistas como recorridos abiertos, para mostrarlas junto a
   * las del servidor. Sólo llevan los campos que lee la interfaz del
   * pendiente y el formulario de llegada; el resto va en nulo porque todavía
   * no existe.
   */
  readonly queuedOpenTrips = computed<readonly Trip[]>(() =>
    this.entries()
      .filter((entry): entry is TripDepartureEntry => entry.kind === 'departure')
      .filter((entry) => !this.arrivalFor(entry.id))
      .map((entry) => asTrip(entry)),
  );

  constructor() {
    /// Un solo disparador para los dos momentos en que puede vaciarse: al
    /// arrancar la aplicación y al recuperar la conexión.
    effect(() => {
      if (!this.connectivity.online()) return;
      /// `untracked` no es opcional: `flush()` lee y escribe la cola y el
      /// propio `flushing`, así que sin esto el efecto se re-dispararía con
      /// cada cambio que él mismo provoca — y un envío que falla por red
      /// (deja la cola igual y `flushing` en false) lo haría en bucle.
      untracked(() => void this.flush());
    });
  }

  /** Texto legible de un pendiente, para los avisos de la interfaz. */
  describe(entry: TripOutboxEntry): string {
    return entry.kind === 'departure'
      ? `Salida a ${entry.input.destination} · ${entry.meta.vehiclePlate}`
      : `Llegada · ${entry.meta.vehiclePlate}`;
  }

  queueDeparture(input: CreateTripInput, meta: TripOutboxMeta): TripDepartureEntry {
    const entry: TripDepartureEntry = {
      kind: 'departure',
      id: newLocalId(),
      createdAt: new Date().toISOString(),
      meta,
      input,
    };
    this.append(entry);
    return entry;
  }

  queueArrival(tripId: string, input: CloseTripInput, meta: TripOutboxMeta): TripArrivalEntry {
    const entry: TripArrivalEntry = {
      kind: 'arrival',
      id: newLocalId(),
      createdAt: new Date().toISOString(),
      meta,
      tripId,
      input,
    };
    this.append(entry);
    return entry;
  }

  /**
   * ¿Este id es el provisional de una salida todavía en cola? Su llegada no
   * puede ir al servidor hasta que la salida tenga id real.
   */
  isQueuedTrip(tripId: string): boolean {
    return isLocalId(tripId);
  }

  /** Llegada en cola de un recorrido, para no ofrecer cerrarlo dos veces. */
  arrivalFor(tripId: string): TripArrivalEntry | null {
    return (
      this.entries().find(
        (entry): entry is TripArrivalEntry => entry.kind === 'arrival' && entry.tripId === tripId,
      ) ?? null
    );
  }

  /** Vuelve a dejar un rechazado como pendiente y reintenta la cola. */
  async retry(id: string): Promise<void> {
    this.patch(id, (entry) => ({ ...entry, error: undefined }));
    await this.flush();
  }

  /** Descarta un pendiente. Lo registrado se pierde: sólo para rechazos irrecuperables. */
  discard(id: string): void {
    const entry = this.entries().find((candidate) => candidate.id === id);
    this.write(this.entries().filter((candidate) => candidate.id !== id));
    /// Descartar una salida deja su llegada sin recorrido al que colgarse.
    if (entry?.kind === 'departure') {
      const orphan = this.arrivalFor(entry.id);
      if (orphan) {
        this.patch(orphan.id, (candidate) => ({
          ...candidate,
          error: 'Se descartó la salida de este recorrido; vuelva a registrarla.',
        }));
      }
    }
  }

  /**
   * Envía lo pendiente en orden. Se detiene en el primer fallo de red para
   * no romper la cadena salida → llegada; vuelve a intentarlo el siguiente
   * disparo.
   */
  async flush(): Promise<void> {
    if (this.flushingState() || !this.connectivity.online() || this.pending().length === 0) {
      return;
    }
    this.flushingState.set(true);
    let sent = 0;
    try {
      /// Se recorre por id y se vuelve a leer la entrada en cada vuelta: el
      /// envío de una salida reescribe el `tripId` de su llegada.
      for (const id of this.pending().map((entry) => entry.id)) {
        const entry = this.entries().find((candidate) => candidate.id === id);
        if (!entry || entry.error) continue;
        const outcome = await this.send(entry);
        if (outcome === 'unsent') break;
        if (outcome === 'sent') sent++;
      }
    } finally {
      this.flushingState.set(false);
      if (sent > 0) this.flushedAtState.set(Date.now());
    }
  }

  private async send(entry: TripOutboxEntry): Promise<'sent' | 'unsent' | 'rejected'> {
    try {
      if (entry.kind === 'departure') {
        const trip = await this.sendDeparture(entry.input);
        this.rebindArrivals(entry.id, trip.id);
      } else {
        if (isLocalId(entry.tripId)) {
          /// Su salida ya no está en cola y nunca llegó al servidor (si
          /// hubiera llegado, `rebindArrivals` habría puesto el id real).
          this.patch(entry.id, (candidate) => ({
            ...candidate,
            error: 'La salida de este recorrido no se registró; vuelva a registrar el recorrido.',
          }));
          return 'rejected';
        }
        await this.sendArrival(entry.tripId, entry.input);
      }
      this.write(this.entries().filter((candidate) => candidate.id !== entry.id));
      return 'sent';
    } catch (error) {
      if (isRetryableError(error)) {
        return 'unsent';
      }
      this.patch(entry.id, (candidate) => ({
        ...candidate,
        error: errorMessage(error, 'El servidor rechazó el registro.'),
      }));
      return 'rejected';
    }
  }

  private async sendDeparture(input: CreateTripInput): Promise<Trip> {
    const result = await firstValueFrom(
      this.apollo.mutate<{ createTrip: Trip }>({
        mutation: CREATE_TRIP_MUTATION,
        variables: { input },
        refetchQueries: ['Trips'],
      }),
    );
    return result.data!.createTrip;
  }

  private async sendArrival(tripId: string, input: CloseTripInput): Promise<void> {
    await firstValueFrom(
      this.apollo.mutate<{ closeTrip: Trip }>({
        mutation: CLOSE_TRIP_MUTATION,
        variables: { id: tripId, input },
        refetchQueries: ['Trips'],
      }),
    );
  }

  /** Cambia el id provisional de una salida ya enviada por el que dio el servidor. */
  private rebindArrivals(localId: string, serverId: string): void {
    this.write(
      this.entries().map((entry) =>
        entry.kind === 'arrival' && entry.tripId === localId
          ? { ...entry, tripId: serverId }
          : entry,
      ),
    );
  }

  private append(entry: TripOutboxEntry): void {
    this.write([...this.entries(), entry]);
  }

  private patch(id: string, change: (entry: TripOutboxEntry) => TripOutboxEntry): void {
    this.write(this.entries().map((entry) => (entry.id === id ? change(entry) : entry)));
  }

  private write(entries: readonly TripOutboxEntry[]): void {
    this.store.set(entries);
    this.cache.write(CACHE_KEY, entries);
  }
}

function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_PREFIX);
}

/**
 * `crypto.randomUUID` sólo existe en contexto seguro y el sistema se sirve
 * por http en la red del Comando (`docs/DESPLIEGUE.md`), así que hay que
 * tener alternativa. El id sólo necesita no repetirse dentro de la cola de
 * un usuario, no ser un uuid.
 */
function newLocalId(): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${LOCAL_PREFIX}${unique}`;
}

function asTrip(entry: TripDepartureEntry): Trip {
  return {
    id: entry.id,
    departureAt: entry.input.departureAt,
    departureOdometer: entry.input.departureOdometer,
    departureFuelLevel: entry.input.departureFuelLevel ?? null,
    departureConditionNotes: entry.input.departureConditionNotes ?? null,
    returnAt: null,
    returnOdometer: null,
    returnFuelLevel: null,
    returnConditionNotes: null,
    damagesFound: null,
    incidentNotes: null,
    distanceKm: null,
    destination: entry.input.destination,
    vehicle: { id: entry.input.vehicleId, plate: entry.meta.vehiclePlate, currentUnit: null },
    /// El nombre va entero en `firstName`: la interfaz del pendiente no lo
    /// muestra, pero el tipo `Trip` lo exige.
    driver: { id: entry.input.driverId, firstName: entry.meta.driverName, lastName: '' },
  };
}
