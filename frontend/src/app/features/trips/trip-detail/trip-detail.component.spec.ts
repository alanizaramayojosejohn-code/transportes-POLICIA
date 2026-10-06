import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Trip } from '../trip.model';
import { TripDetailComponent } from './trip-detail.component';

const OPEN_TRIP: Trip = {
  id: 't-1',
  departureAt: '2026-09-01T12:00:00.000Z',
  departureOdometer: 12000,
  departureFuelLevel: 80,
  departureConditionNotes: 'Sale en buen estado',
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

const CLOSED_TRIP: Trip = {
  ...OPEN_TRIP,
  returnAt: '2026-09-01T18:00:00.000Z',
  returnOdometer: 12150,
  returnFuelLevel: 40,
  returnConditionNotes: 'Vuelve con una rayadura',
  damagesFound: 'Rayadura en puerta trasera',
  incidentNotes: 'Se informó al encargado',
  distanceKm: 150,
};

@Component({
  imports: [TripDetailComponent],
  template: `<app-trip-detail [trip]="trip()" (closed)="closedCount = closedCount + 1" />`,
})
class HostComponent {
  readonly trip = signal<Trip>(OPEN_TRIP);
  closedCount = 0;
}

function setup(trip: Trip) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.trip.set(trip);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    closeButton: () =>
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cerrar'),
  };
}

describe('TripDetailComponent', () => {
  it('muestra la placa, el conductor y la unidad del vehículo', () => {
    const { text } = setup(OPEN_TRIP);

    expect(text()).toContain('4021-LIG');
    expect(text()).toContain('Juan Pérez');
    expect(text()).toContain('UTOP');
    expect(text()).toContain('Caracollo');
  });

  it('un recorrido sin llegada se rotula Abierto y no inventa datos de retorno', () => {
    const { text } = setup(OPEN_TRIP);

    expect(text()).toContain('Abierto');
    expect(text()).not.toContain('Cerrado');
    expect(text()).toContain('Salida 80%');
    expect(text()).not.toContain('Llegada 40%');
    expect(text()).toContain('Sin daños registrados.');
    expect(text()).toContain('Sin observaciones.');
  });

  it('un recorrido cerrado muestra kilometraje, combustible y daños', () => {
    const { text } = setup(CLOSED_TRIP);

    expect(text()).toContain('Cerrado');
    expect(text()).toContain('Salida 80% · Llegada 40%');
    expect(text()).toContain('12150');
    expect(text()).toContain('150');
    expect(text()).toContain('Rayadura en puerta trasera');
    expect(text()).toContain('Se informó al encargado');
  });

  it('compone el estado del vehículo con lo declarado a la salida y a la llegada', () => {
    const { text } = setup(CLOSED_TRIP);

    expect(text()).toContain('Salida: Sale en buen estado');
    expect(text()).toContain('Llegada: Vuelve con una rayadura');
  });

  it('un vehículo sin unidad asignada no deja la celda en blanco', () => {
    const { text } = setup({
      ...OPEN_TRIP,
      vehicle: { ...OPEN_TRIP.vehicle, currentUnit: null },
    });

    expect(text()).toContain('Sin asignar');
  });

  it('el botón Cerrar avisa al listado que cierre la ficha', () => {
    const { host, closeButton } = setup(OPEN_TRIP);

    closeButton()?.click();

    expect(host.closedCount).toBe(1);
  });
});
