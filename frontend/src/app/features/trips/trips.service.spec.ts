import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { Trip, TripPage } from './trip.model';
import { TripsService } from './trips.service';

const TRIP: Trip = {
  id: 't-1',
  departureAt: '2026-09-01T08:00:00.000Z',
  departureOdometer: 12000,
  departureFuelLevel: 80,
  departureConditionNotes: 'Sin novedad',
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

function setup() {
  TestBed.configureTestingModule({ imports: [ApolloTestingModule] });
  return {
    service: TestBed.inject(TripsService),
    controller: TestBed.inject(ApolloTestingController),
  };
}

describe('TripsService', () => {
  beforeEach(() => TestBed.resetTestingModule());

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

    const created = service.create(input);
    const op = controller.expectOne('CreateTrip');
    expect(op.operation.variables).toEqual({ input });
    op.flush({ data: { createTrip: TRIP } });

    expect((await created).id).toBe('t-1');
    controller.verify();
  });

  it('close envía el cierre con el id y los datos de llegada', async () => {
    const { service, controller } = setup();
    const input = { returnOdometer: 12150, returnFuelLevel: 40 };

    const closed = service.close('t-1', input);
    const op = controller.expectOne('CloseTrip');
    expect(op.operation.variables).toEqual({ id: 't-1', input });
    op.flush({
      data: { closeTrip: { ...TRIP, returnAt: '2026-09-01T12:00:00.000Z', distanceKm: 150 } },
    });

    expect((await closed).distanceKm).toBe(150);
    controller.verify();
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
