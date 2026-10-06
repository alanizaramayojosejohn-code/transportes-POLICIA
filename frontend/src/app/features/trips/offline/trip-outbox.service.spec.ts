import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { ConnectivityService } from '../../../core/offline/connectivity.service';
import { CreateTripInput } from '../trip.model';
import { TripOutboxService } from './trip-outbox.service';

const SESSION = {
  accessToken: 'token-abc',
  user: { id: 'u-1', username: 'conductor.01', fullName: 'Juan Pérez', role: 'CONDUCTOR' },
};

const META = { vehiclePlate: '4021-LIG', driverName: 'Juan Pérez' };

const DEPARTURE: CreateTripInput = {
  vehicleId: 'v-1',
  driverId: 'd-1',
  destination: 'Caracollo',
  departureAt: '2026-09-01T08:00:00.000Z',
  departureOdometer: 12000,
};

const CREATED_TRIP = { id: 't-1', __typename: 'Trip' };

function setup(online = true) {
  const state = signal(online);
  TestBed.configureTestingModule({
    imports: [ApolloTestingModule],
    providers: [
      provideRouter([]),
      { provide: ConnectivityService, useValue: { online: state.asReadonly() } },
    ],
  });
  return {
    outbox: TestBed.inject(TripOutboxService),
    controller: TestBed.inject(ApolloTestingController),
  };
}

/**
 * Deja correr las promesas pendientes. `flush()` envía de a una y encadena
 * promesas entre un envío y el siguiente, así que la segunda operación no
 * está emitida en el mismo tick que la respuesta de la primera. Un
 * `setTimeout` vacía toda la cola de microtareas de una vez, sin suponer
 * cuántos `await` hay por medio.
 *
 * `controller.match()` no sirve para esperarla: consume las operaciones que
 * encuentra, igual que `HttpTestingController.match`, y el `expectOne`
 * siguiente ya no las ve.
 */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('TripOutboxService', () => {
  beforeEach(() => {
    localStorage.clear();
    /// La cola se acota al usuario autenticado, así que hace falta sesión.
    localStorage.setItem('transportes.auth', JSON.stringify(SESSION));
    TestBed.resetTestingModule();
  });

  it('guarda lo encolado en el equipo, para que sobreviva a cerrar la aplicación', () => {
    const { outbox } = setup(false);

    outbox.queueDeparture(DEPARTURE, META);

    expect(outbox.pending()).toHaveLength(1);
    expect(outbox.describe(outbox.pending()[0])).toBe('Salida a Caracollo · 4021-LIG');

    /// Un servicio nuevo —equivalente a volver a abrir la aplicación— lee lo
    /// mismo de `localStorage`.
    TestBed.resetTestingModule();
    expect(setup(false).outbox.pending()).toHaveLength(1);
  });

  it('no envía nada mientras no haya conexión', async () => {
    const { outbox, controller } = setup(false);
    outbox.queueDeparture(DEPARTURE, META);

    await outbox.flush();

    expect(outbox.pending()).toHaveLength(1);
    controller.verify();
  });

  it('envía lo pendiente y lo saca de la cola', async () => {
    const { outbox, controller } = setup();
    outbox.queueDeparture(DEPARTURE, META);

    const flushed = outbox.flush();
    const op = controller.expectOne('CreateTrip');
    expect(op.operation.variables).toEqual({ input: DEPARTURE });
    op.flush({ data: { createTrip: CREATED_TRIP } });
    await flushed;

    expect(outbox.entries()).toHaveLength(0);
    expect(outbox.flushedAt()).toBeGreaterThan(0);
  });

  /// El caso que justifica la cola: un conductor sin señal durante todo el
  /// recorrido registra la salida y la llegada antes de recuperar red, así
  /// que la llegada queda colgada de un id que todavía no existe.
  it('cierra la llegada con el id real que devolvió el servidor', async () => {
    const { outbox, controller } = setup();
    const departure = outbox.queueDeparture(DEPARTURE, META);
    outbox.queueArrival(departure.id, { returnOdometer: 12150 }, META);
    expect(departure.id).not.toBe('t-1');

    const flushed = outbox.flush();
    controller.expectOne('CreateTrip').flush({ data: { createTrip: CREATED_TRIP } });
    await settle();

    const close = controller.expectOne('CloseTrip');
    expect(close.operation.variables['id']).toBe('t-1');
    close.flush({ data: { closeTrip: { ...CREATED_TRIP, returnAt: '2026-09-01T12:00:00.000Z' } } });
    await flushed;

    expect(outbox.entries()).toHaveLength(0);
  });

  it('un fallo de red deja la cola intacta para el siguiente intento', async () => {
    const { outbox, controller } = setup();
    outbox.queueDeparture(DEPARTURE, META);

    const flushed = outbox.flush();
    controller.expectOne('CreateTrip').networkError(new Error('Failed to fetch'));
    await flushed;

    expect(outbox.pending()).toHaveLength(1);
    expect(outbox.failed()).toHaveLength(0);
  });

  /// Reintentar lo que el servidor ya rechazó daría el mismo rechazo y
  /// taparía el aviso, así que queda marcado y esperando al usuario.
  it('marca el rechazo del servidor y no lo vuelve a intentar', async () => {
    const { outbox, controller } = setup();
    outbox.queueDeparture(DEPARTURE, META);

    const flushed = outbox.flush();
    controller
      .expectOne('CreateTrip')
      .graphqlErrors([{ message: 'El vehículo ya tiene un recorrido abierto' }]);
    await flushed;

    expect(outbox.pending()).toHaveLength(0);
    expect(outbox.failed()[0].error).toContain('ya tiene un recorrido abierto');

    await outbox.flush();
    controller.verify();
  });

  it('descartar una salida deja marcada su llegada en cola', () => {
    const { outbox } = setup(false);
    const departure = outbox.queueDeparture(DEPARTURE, META);
    outbox.queueArrival(departure.id, { returnOdometer: 12150 }, META);

    outbox.discard(departure.id);

    expect(outbox.entries()).toHaveLength(1);
    expect(outbox.failed()[0].error).toContain('Se descartó la salida');
  });

  /// Una salida con su llegada ya registrada no es un pendiente de llegada:
  /// «Mi vehículo» no debe volver a pedirla.
  it('queuedOpenTrips excluye las salidas que ya tienen llegada en cola', () => {
    const { outbox } = setup(false);
    const departure = outbox.queueDeparture(DEPARTURE, META);

    expect(outbox.queuedOpenTrips()).toHaveLength(1);
    expect(outbox.queuedOpenTrips()[0].id).toBe(departure.id);
    expect(outbox.queuedOpenTrips()[0].vehicle.plate).toBe('4021-LIG');

    outbox.queueArrival(departure.id, { returnOdometer: 12150 }, META);

    expect(outbox.queuedOpenTrips()).toHaveLength(0);
  });
});
