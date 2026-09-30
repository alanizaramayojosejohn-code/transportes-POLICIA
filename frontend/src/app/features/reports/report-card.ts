import { Role } from '../../core/current-role.service';

export interface ReportCard {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly roles: readonly Role[];
  /** Filtros que ofrece la pantalla del reporte, para la ficha (`reporteDetalleModal`). */
  readonly filters: string;
  /** Qué columnas/datos consolida, para la ficha. */
  readonly includes: string;
}

/**
 * Catálogo de reportes (spec 018): la maqueta (`prototipo/index.html:3167-3401`) muestra 10
 * tarjetas iguales para cualquier usuario; aquí cada una se filtra por rol según la separación
 * de dominios que ya existe en el sidebar (`shell.component.ts`). 8 tarjetas reutilizan las
 * pantallas de listado que ya existen (con sus propios filtros de vehículo/fecha);
 * «Movimientos de almacén» y «Historial integral del vehículo» son reportes nuevos con
 * pantalla propia.
 *
 * Vive fuera del componente porque la ficha de detalle también lo consume, y tenerlo en el
 * componente la haría importar de quien la importa.
 */
export const REPORT_CARDS: readonly ReportCard[] = [
  {
    key: 'vehiculos',
    title: 'Vehículos por unidad',
    description: 'Distribución del parque automotor por unidad y estado actual.',
    path: '/vehiculos',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
    filters: 'Búsqueda, condición y tipo de vehículo',
    includes: 'Placa, marca, modelo, unidad asignada, condición vigente y último kilometraje.',
  },
  {
    key: 'asignaciones',
    title: 'Historial de asignaciones',
    description: 'Unidades por las que estuvo asignado cada vehículo y periodos registrados.',
    path: '/asignaciones',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
    filters: 'Búsqueda y estado (actuales / históricas)',
    includes: 'Vehículo, unidad, fechas de inicio y fin, motivo y documento de respaldo.',
  },
  {
    key: 'recorridos',
    title: 'Historial de recorridos',
    description: 'Salidas, retornos, conductores, destinos y kilometraje recorrido.',
    path: '/recorridos',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'COMBUSTIBLE'],
    filters: 'Búsqueda y estado (abiertos / cerrados)',
    includes: 'Vehículo, conductor, destino, salida, llegada y kilómetros recorridos.',
  },
  {
    key: 'combustible',
    title: 'Consumo de combustible',
    description: 'Litros, importes, estaciones, kilometraje y vales registrados.',
    path: '/combustible',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'COMBUSTIBLE'],
    filters: 'Búsqueda y tipo de combustible',
    includes: 'Fecha, vehículo, kilometraje, litros, importe, estación y rendimiento.',
  },
  {
    key: 'mantenimientos',
    title: 'Mantenimientos',
    description: 'Servicios preventivos y correctivos, costos y próximos mantenimientos.',
    path: '/mantenimiento',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'MANTENIMIENTO'],
    filters: 'Búsqueda, tipo y estado de la orden',
    includes: 'Fecha, vehículo, tipo, taller, kilometraje de ingreso, costo y estado.',
  },
  {
    key: 'inventario',
    title: 'Kardex / inventario',
    description: 'Existencias, stock mínimo y estado actual de los artículos registrados.',
    path: '/inventario',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'MANTENIMIENTO', 'ALMACEN'],
    filters: 'Búsqueda, categoría, tipo de artículo y estado',
    includes: 'Código, artículo, categoría, unidad de medida, stock actual y mínimo.',
  },
  {
    key: 'movimientos',
    title: 'Movimientos de almacén',
    description: 'Entradas y salidas de repuestos, materiales y lubricantes.',
    path: '/reportes/movimientos-almacen',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'MANTENIMIENTO', 'ALMACEN'],
    filters: 'Artículo, vehículo destino, tipo de movimiento y rango de fechas',
    includes: 'Fecha, artículo, tipo, cantidad, saldo resultante y destino u origen.',
  },
  {
    key: 'incidentes',
    title: 'Incidentes vehiculares',
    description: 'Hechos registrados por vehículo, conductor, unidad, lugar y fecha.',
    path: '/incidentes',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
    filters: 'Búsqueda y tipo de incidente',
    includes: 'Fecha, vehículo, conductor, tipo, lugar y referencia policial.',
  },
  {
    key: 'conductores',
    title: 'Conductores',
    description: 'Padrón de conductores, licencias, unidades y vehículos asociados.',
    path: '/conductores',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
    filters: 'Búsqueda, unidad y estado',
    includes: 'CI, nombre, grado, licencia y vencimiento, unidad y vehículo a cargo.',
  },
  {
    key: 'historial',
    title: 'Historial integral del vehículo',
    description:
      'Consolida asignaciones, recorridos, combustible, mantenimientos, incidentes y almacén de un vehículo.',
    path: '/reportes/historial-vehiculo',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
    filters: 'Vehículo, tipos de evento y rango de fechas',
    includes: 'Una línea de tiempo con todo lo registrado sobre el vehículo, evento por evento.',
  },
];
