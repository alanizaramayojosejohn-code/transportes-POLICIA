import { firstReportUrlFor, reportTabsFor } from './report-tab';

const paths = (role: Parameters<typeof reportTabsFor>[0]) =>
  reportTabsFor(role).map((tab) => tab.path);

describe('reportTabsFor (spec 018, RF-1)', () => {
  it('ADMINISTRADOR y CONSULTA ven los cinco reportes', () => {
    expect(paths('ADMINISTRADOR')).toEqual([
      'combustible',
      'mantenimiento',
      'kilometraje',
      'movimientos-almacen',
      'historial-vehiculo',
    ]);
    expect(paths('CONSULTA')).toEqual(paths('ADMINISTRADOR'));
  });

  it('cada rol operativo ve sólo los reportes de su dominio', () => {
    expect(paths('COMBUSTIBLE')).toEqual(['combustible', 'kilometraje']);
    expect(paths('MANTENIMIENTO')).toEqual(['mantenimiento', 'movimientos-almacen']);
    expect(paths('ALMACEN')).toEqual(['movimientos-almacen']);
    expect(paths('TRANSPORTES')).toEqual([
      'combustible',
      'mantenimiento',
      'kilometraje',
      'historial-vehiculo',
    ]);
  });

  /// RF-1/RF-16: el CONDUCTOR no tiene «Reportes» en el menú; llega al historial de su
  /// vehículo desde «Mi vehículo» y no ve ningún otro reporte.
  it('CONDUCTOR sólo ve el historial del vehículo', () => {
    expect(paths('CONDUCTOR')).toEqual(['historial-vehiculo']);
  });

  it('sin rol no hay pestañas', () => {
    expect(paths(null)).toEqual([]);
  });
});

describe('firstReportUrlFor', () => {
  it('abre el primer reporte del rol, que no es el mismo para todos', () => {
    expect(firstReportUrlFor('ADMINISTRADOR')).toBe('/reportes/combustible');
    expect(firstReportUrlFor('ALMACEN')).toBe('/reportes/movimientos-almacen');
    expect(firstReportUrlFor('CONDUCTOR')).toBe('/reportes/historial-vehiculo');
  });

  /// Sin rol todavía resuelto no se puede elegir reporte: a inicio, que ya sabe qué hacer
  /// con cada rol (`homeGuard`).
  it('sin rol manda a inicio en vez de a un reporte prohibido', () => {
    expect(firstReportUrlFor(null)).toBe('/');
  });
});
