import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { AuthService, AuthUser } from '../../../core/auth.service';
import { Role } from '../../../core/current-role.service';
import { Incident } from '../incident.model';
import { IncidentsListComponent } from './incidents-list.component';

const INCIDENT: Incident = {
  id: 'i-1',
  code: 'INC-0001',
  type: 'ACCIDENTE',
  occurredAt: '2026-09-01T12:00:00.000Z',
  place: 'Av. 6 de Octubre',
  description: 'Colisión leve en intersección',
  damages: 'Paragolpes delantero',
  policeReportNumber: 'CASO-123',
  vehicle: { id: 'v-1', plate: '4021-LIG', currentUnit: { id: 'un-1', name: 'UTOP' } },
  driver: { id: 'd-1', firstName: 'Juan', lastName: 'Pérez' },
};

function setup(role: Role = 'TRANSPORTES') {
  const currentUser = signal<AuthUser | null>({
    id: 'u-1',
    username: 'u',
    fullName: 'Usuario',
    role,
  });
  TestBed.configureTestingModule({
    imports: [ApolloTestingModule],
    providers: [{ provide: AuthService, useValue: { currentUser } }],
  });

  const fixture = TestBed.createComponent(IncidentsListComponent);
  const controller = TestBed.inject(ApolloTestingController);
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    controller,
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    flush: (items: Incident[]) => {
      controller
        .expectOne('Incidents')
        .flush({ data: { incidents: { total: items.length, items } } });
      fixture.detectChanges();
    },
    button: (label: string) =>
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === label),
  };
}

describe('IncidentsListComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  /// El síntoma que se venía arrastrando: la tabla anunciaba «no hay nada» antes de que la
  /// respuesta llegara. Mientras carga debe verse el indicador, no el estado vacío.
  it('mientras carga no anuncia que no hay incidentes', () => {
    const { text } = setup();

    expect(text()).not.toContain('Sin incidentes registrados todavía.');
    expect(text()).toContain('Cargando');
  });

  it('con respuesta vacía sí muestra el estado vacío', () => {
    const { text, flush } = setup();

    flush([]);

    expect(text()).toContain('Sin incidentes registrados todavía.');
    expect(text()).not.toContain('Cargando');
  });

  it('lista los incidentes recibidos', () => {
    const { text, flush } = setup();

    flush([INCIDENT]);

    expect(text()).toContain('4021-LIG');
    expect(text()).toContain('Juan Pérez');
    expect(text()).toContain('Accidente de tránsito');
    expect(text()).toContain('CASO-123');
  });

  it('«Ver» abre la ficha del incidente con su descripción completa', () => {
    const { text, flush, button, fixture } = setup();
    flush([INCIDENT]);

    button('Ver')?.click();
    fixture.detectChanges();

    expect(text()).toContain('Detalle del incidente');
    expect(text()).toContain('Colisión leve en intersección');
    expect(text()).toContain('Paragolpes delantero');
    expect(text()).toContain('UTOP');
  });

  it('un rol de sólo lectura no ve el botón de registrar', () => {
    const { flush, button } = setup('CONSULTA');
    flush([INCIDENT]);

    expect(button('+ Registrar incidente')).toBeUndefined();
    expect(button('Ver')).toBeDefined();
  });

  it('un rol con escritura sí ve el botón de registrar', () => {
    const { flush, button } = setup('ADMINISTRADOR');
    flush([INCIDENT]);

    expect(button('+ Registrar incidente')).toBeDefined();
  });
});
