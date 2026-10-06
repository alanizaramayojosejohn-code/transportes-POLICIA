import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { FuelConsumptionReportComponent } from './fuel-consumption-report.component';
import { FuelConsumptionReport, FuelConsumptionRow } from './consolidated-report.model';

const ROW: FuelConsumptionRow = {
  groupId: 'v-1',
  groupLabel: '4021-LIG',
  groupDetail: 'Toyota Hilux · UTOP',
  vehicleCount: 1,
  records: 3,
  liters: 120.5,
  totalCost: 482,
  avgUnitPrice: 4,
  distanceKm: 1205,
  efficiencyKmPerLiter: 10,
};

function report(items: FuelConsumptionRow[]): FuelConsumptionReport {
  return {
    items,
    total: items.length,
    totalRecords: items.reduce((t, r) => t + r.records, 0),
    totalLiters: items.reduce((t, r) => t + r.liters, 0),
    totalCost: items.reduce((t, r) => t + r.totalCost, 0),
    totalDistanceKm: items.reduce((t, r) => t + r.distanceKm, 0),
    totalEfficiencyKmPerLiter: items.length > 0 ? 10 : null,
  };
}

function setup() {
  TestBed.configureTestingModule({ imports: [ApolloTestingModule] });

  const fixture = TestBed.createComponent(FuelConsumptionReportComponent);
  const controller = TestBed.inject(ApolloTestingController);
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    headers: () => Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim()),
    flush: (items: FuelConsumptionRow[]) => {
      controller
        .expectOne('FuelConsumptionReport')
        .flush({ data: { fuelConsumptionReport: report(items) } });
      fixture.detectChanges();
    },
    selectGroupBy: (value: 'VEHICLE' | 'UNIT') => {
      const select = el.querySelector<HTMLSelectElement>('select[title="Agrupación del reporte"]');
      if (!select) throw new Error('No se encontró el selector de agrupación');
      select.value = value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    },
  };
}

describe('FuelConsumptionReportComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('con respuesta vacía muestra el estado vacío, no una fila de ceros', () => {
    const { text, flush } = setup();

    flush([]);

    expect(text()).toContain('Sin cargas de combustible para los filtros seleccionados.');
    expect(text()).not.toContain('Total del periodo');
  });

  it('muestra litros, importe y rendimiento de cada fila y el total del periodo', () => {
    const { text, flush } = setup();

    flush([ROW, { ...ROW, groupId: 'v-2', groupLabel: '1234-ABC', liters: 20, totalCost: 80 }]);

    expect(text()).toContain('4021-LIG');
    expect(text()).toContain('Toyota Hilux · UTOP');
    expect(text()).toContain('120.50');
    expect(text()).toContain('Bs. 482.00');
    expect(text()).toContain('Total del periodo');
    /// El total es de todo el resultado filtrado, no sólo de las filas visibles.
    expect(text()).toContain('140.50');
    expect(text()).toContain('Bs. 562.00');
  });

  it('un promedio sin denominador se muestra como «—», no como cero', () => {
    const { text, flush } = setup();

    flush([{ ...ROW, liters: 0, avgUnitPrice: null, efficiencyKmPerLiter: null }]);

    expect(text()).toContain('—');
  });

  /// RF-21: agrupando por unidad la fila es una unidad y la cantidad de vehículos que aporta
  /// pasa a ser información útil; agrupando por vehículo siempre valdría 1.
  it('la columna «Vehículos» aparece sólo al agrupar por unidad', () => {
    const { headers, flush, selectGroupBy } = setup();
    flush([ROW]);

    expect(headers()).toContain('Vehículo');
    expect(headers()).not.toContain('Vehículos');

    selectGroupBy('UNIT');
    flush([{ ...ROW, groupId: 'u-1', groupLabel: 'UTOP', groupDetail: null, vehicleCount: 4 }]);

    expect(headers()).toContain('Unidad');
    expect(headers()).toContain('Vehículos');
  });
});
