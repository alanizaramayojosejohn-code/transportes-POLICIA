import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { CardComponent } from '../../shared/card/card.component';
import { NoticeComponent } from '../../shared/notice/notice.component';
import { ButtonDirective } from '../../shared/button/button.directive';
import { CurrentRoleService, Role } from '../../core/current-role.service';

interface ReportCard {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly roles: readonly Role[];
}

/**
 * Menú de reportes (spec 018): la maqueta (`prototipo/index.html:3167-3401`) muestra 10 tarjetas
 * iguales para cualquier usuario; aquí cada una se filtra por rol según la separación de dominios
 * que ya existe en el sidebar (`shell.component.ts`). 8 tarjetas reutilizan las pantallas de
 * listado que ya existen (con sus propios filtros de vehículo/fecha); «Movimientos de almacén» y
 * «Historial integral del vehículo» son reportes nuevos con pantalla propia.
 */
const REPORT_CARDS: readonly ReportCard[] = [
  {
    key: 'vehiculos',
    title: 'Vehículos por unidad',
    description: 'Distribución del parque automotor por unidad y estado actual.',
    path: '/vehiculos',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
  },
  {
    key: 'asignaciones',
    title: 'Historial de asignaciones',
    description: 'Unidades por las que estuvo asignado cada vehículo y periodos registrados.',
    path: '/asignaciones',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
  },
  {
    key: 'recorridos',
    title: 'Historial de recorridos',
    description: 'Salidas, retornos, conductores, destinos y kilometraje recorrido.',
    path: '/recorridos',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'COMBUSTIBLE'],
  },
  {
    key: 'combustible',
    title: 'Consumo de combustible',
    description: 'Litros, importes, estaciones, kilometraje y vales registrados.',
    path: '/combustible',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'COMBUSTIBLE'],
  },
  {
    key: 'mantenimientos',
    title: 'Mantenimientos',
    description: 'Servicios preventivos y correctivos, costos y próximos mantenimientos.',
    path: '/mantenimiento',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'MANTENIMIENTO'],
  },
  {
    key: 'inventario',
    title: 'Kardex / inventario',
    description: 'Existencias, stock mínimo y estado actual de los artículos registrados.',
    path: '/inventario',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'MANTENIMIENTO', 'ALMACEN'],
  },
  {
    key: 'movimientos',
    title: 'Movimientos de almacén',
    description: 'Entradas y salidas de repuestos, materiales y lubricantes.',
    path: '/reportes/movimientos-almacen',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'MANTENIMIENTO', 'ALMACEN'],
  },
  {
    key: 'incidentes',
    title: 'Incidentes vehiculares',
    description: 'Hechos registrados por vehículo, conductor, unidad, lugar y fecha.',
    path: '/incidentes',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
  },
  {
    key: 'conductores',
    title: 'Conductores',
    description: 'Padrón de conductores, licencias, unidades y vehículos asociados.',
    path: '/conductores',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
  },
  {
    key: 'historial',
    title: 'Historial integral del vehículo',
    description:
      'Consolida asignaciones, recorridos, combustible, mantenimientos, incidentes y almacén de un vehículo.',
    path: '/reportes/historial-vehiculo',
    roles: ['ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES'],
  },
];

@Component({
  imports: [PageHeadComponent, CardComponent, NoticeComponent, ButtonDirective, RouterLink],
  selector: 'app-reports',
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  protected readonly cards = computed(() => {
    const role = this.currentRole.role();
    return REPORT_CARDS.filter((card) => role !== null && card.roles.includes(role));
  });

  constructor(private readonly currentRole: CurrentRoleService) {}
}
