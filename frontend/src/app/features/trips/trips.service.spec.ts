import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { ConnectivityService } from '../../core/offline/connectivity.service';
import { TripOutboxService } from './offline/trip-outbox.service';
import { Trip, TripPage } from './trip.model';
import { TripsService } from './trips.service';

const TRIP: Trip = {
  id: 't-1',
  departureAt: '2026-09-01T08:00:00.000Z',
  departureOdometer: 12000,
  departureFuelLevel: 80,
  departureConditionNotes: 'Bueno',
  returnAt: null,
  returnOdometer: null,
  returnFuelLevel: null,
  returnConditionNotes: null,
  damagesFound: null,
  incidentNotes: null,
  distanceKm: null,
  destination: 'Caracollo',
  vehicle: { id: 'v-1', plate: '4021-LIG', currentUnit: { id: 'un-1', name: 'UTOP' } },
  driver: { id: 'd-1', firstName: 'Juan', lastName: 'Pérez' },
};

const META = { vehiclePlate: '4021-LIG', driverName: 'Juan Pérez' };

const SESSION = {
  accessToken: 'token-abc',
  user: { id: 'u-1', username: 'conductor.01', fullName: 'Juan Pérez', role: 'CONDUCTOR' },
};

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
    service: TestBed.inject(TripsService),
    outbox: TestBed.inject(TripOutboxService),
    controller: TestBed.inject(ApolloTestingController),
  };
}

/** Deja correr las promesas pendientes antes de comprobar lo que emitió un stream. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('TripsService', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('transportes.auth', JSON.stringify(SESSION));
    TestBed.resetTestingModule();
  });

  it('list pide los recorridos con el filtro recibido', () => {
    const { service, controller } = setup();

    service.list({ open: true, skip: 20, take: 20 }).subscribe();

    const op = controller.expectOne('Trips');
    expect(op.operation.variables).toEqual({ open: true, skip: 20, take: 20 });
    op.flush({ data: { trips: { total: 1, items: [TRIP] } } });
    controller.verify();
  });

  /// El listado no debe recibir una página vacía antes de la respuesta: eso es lo que hacía
  /// parpadear «Sin recorridos registrados» en cada navegación (ver `queryData`).
  it('list no emite nada hasta que llega la respuesta', () => {
    const { service, controller } = setup();
    const emissions: TripPage[] = [];

    service.list({}).subscribe((page) => emissions.push(page));
    expect(emissions).toEqual([]);

    controller.expectOne('Trips').flush({ data: { trips: { total: 1, items: [TRIP] } } });

    expect(emissions.length).toBe(1);
    expect(emissions[0].total).toBe(1);
    expect(emissions[0].items[0].vehicle.plate).toBe('4021-LIG');
  });

  it('create envía el alta y devuelve el recorrido creado', async () => {
    const { service, controller } = setup();
    const input = {
      vehicleId: 'v-1',
      driverId: 'd-1',
      destination: 'Caracollo',
      departureAt: '2026-09-01T08:00:00.000Z',
      departureOdometer: 12000,
    };

    const created = service.create(input, META);
    const op = controller.expectOne('CreateTrip');
    expect(op.operation.variables).toEqual({ input });
    op.flush({ data: { createTrip: TRIP } });

    const result = await created;
    expect(result.queued).toBe(false);
    expect(result).toHaveProperty('trip.id', 't-1');
    controller.verify();
  });

  it('close envía el cierre con el id y los datos de llegada', async () => {
    const { service, controller } = setup();
    const input = { returnOdometer: 12150, returnFuelLevel: 40 };

    const closed = service.close('t-1', input, META);
    const op = controller.expectOne('CloseTrip');
    expect(op.operation.variables).toEqual({ id: 't-1', input });
    op.flush({
      data: { closeTrip: { ...TRIP, returnAt: '2026-09-01T12:00:00.000Z', distanceKm: 150 } },
    });

    const result = await closed;
    expect(result).toHaveProperty('trip.distanceKm', 150);
    controller.verify();
  });

  /// Spec 006, RF-13: sin conexión el registro no se pierde ni se intenta —
  /// queda en la cola y ni se toca la red.
  it('sin conexión encola la salida en vez de enviarla', async () => {
    const { service, outbox, controller } = setup(false);

    const result = await service.create(
      {
        vehicleId: 'v-1',
        driverId: 'd-1',
        destination: 'Caracollo',
        departureAt: '2026-09-01T08:00:00.000Z',
        departureOdometer: 12000,
      },
      META,
    );

    expect(result.queued).toBe(true);
    expect(outbox.pending()).toHaveLength(1);
    controller.verify();
  });

  it('sin conexión encola la llegada en vez de enviarla', async () => {
    const { service, outbox, controller } = setup(false);

    const result = await service.close('t-1', { returnOdometer: 12150 }, META);

    expect(result.queued).toBe(true);
    expect(outbox.arrivalFor('t-1')).not.toBeNull();
    controller.verify();
  });

  /// `navigator.onLine` es optimista: dice que hay interfaz de red, no que el
  /// servidor conteste. Un fallo de transporte también encola (RF-14).
  it('un fallo de red encola la salida aunque el navegador se crea en línea', async () => {
    const { service, outbox, controller } = setup();

    const created = service.create(
      {
        vehicleId: 'v-1',
        driverId: 'd-1',
        destination: 'Caracollo',
        departureAt: '2026-09-01T08:00:00.000Z',
        departureOdometer: 12000,
      },
      META,
    );
    controller.expectOne('CreateTrip').networkError(new Error('Failed to fetch'));

    expect((await created).queued).toBe(true);
    expect(outbox.pending()).toHaveLength(1);
  });

  /// Lo que el servidor rechazó no se encola: encolarlo le haría creer al
  /// usuario que quedó registrado y reintentaría para siempre.
  it('propaga el rechazo del servidor sin encolarlo', async () => {
    const { service, outbox, controller } = setup();

    const created = service.create(
      {
        vehicleId: 'v-1',
        driverId: 'd-1',
        destination: 'Caracollo',
        departureAt: '2026-09-01T08:00:00.000Z',
        departureOdometer: 12000,
      },
      META,
    );
    controller
      .expectOne('CreateTrip')
      .graphqlErrors([{ message: 'El vehículo ya tiene un recorrido abierto' }]);

    await expect(created).rejects.toThrow();
    expect(outbox.entries()).toHaveLength(0);
  });

  /// Cerrar una salida que sigue en cola no puede ir al servidor: el
  /// recorrido todavía no existe allá y su id es provisional.
  it('encola la llegada de una salida que todavía no se envió, incluso en línea', async () => {
    const { service, outbox, controller } = setup();
    const departure = outbox.queueDeparture(
      {
        vehicleId: 'v-1',
        driverId: 'd-1',
        destination: 'Caracollo',
        departureAt: '2026-09-01T08:00:00.000Z',
        departureOdometer: 12000,
      },
      META,
    );

    const result = await service.close(departure.id, { returnOdometer: 12150 }, META);

    expect(result.queued).toBe(true);
    expect(controller.match('CloseTrip')).toHaveLength(0);
  });

  it('openTripFor devuelve el recorrido abierto del vehículo', async () => {
    const { service, controller } = setup();
    const emissions: (Trip | null)[] = [];

    service.openTripFor('v-1').subscribe((trip) => emissions.push(trip));

    const op = controller.expectOne('Trips');
    expect(op.operation.variables).toEqual({ vehicleId: 'v-1', open: true, take: 1 });
    op.flush({ data: { trips: { total: 1, items: [TRIP] } } });

    expect(emissions[0]?.id).toBe('t-1');
  });

  /// Sin esto, un conductor que abre la aplicación ya sin señal no vería el
  /// recorrido que dejó abierto y no podría cerrarlo (RF-13).
  it('openTripFor entrega la copia local cuando la consulta falla sin red', async () => {
    const first = setup();
    first.service.openTripFor('v-1').subscribe();
    first.controller.expectOne('Trips').flush({ data: { trips: { total: 1, items: [TRIP] } } });

    /// Instancia nueva: equivale a volver a abrir la aplicación, con la
    /// caché de Apollo (en memoria) vacía y sólo la copia local disponible.
    TestBed.resetTestingModule();
    const offline = setup(false);
    const emissions: (Trip | null)[] = [];
    offline.service.openTripFor('v-1').subscribe((trip) => emissions.push(trip));
    offline.controller.expectOne('Trips').networkError(new Error('Failed to fetch'));
    await settle();

    expect(emissions.at(-1)?.id).toBe('t-1');
  });

  /// Para exportar hay que traer todo el resultado filtrado, no la página en pantalla.
  it('listAll pide el resultado completo sin paginar la vista', async () => {
    const { service, controller } = setup();

    const rows = service.listAll({ open: true });
    const op = controller.expectOne('Trips');
    expect(op.operation.variables['skip']).toBe(0);
    expect(op.operation.variables['take']).toBeGreaterThan(20);
    op.flush({ data: { trips: { total: 1, items: [TRIP] } } });

    expect(await rows).toHaveLength(1);
  });
});
