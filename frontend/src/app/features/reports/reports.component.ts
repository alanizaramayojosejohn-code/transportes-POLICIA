import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { NoticeComponent } from '../../shared/notice/notice.component';
import { CurrentRoleService } from '../../core/current-role.service';
import { reportTabsFor } from './report-tab';

/**
 * Pantalla de Reportes (spec 018): una sola vista con una pestaña por reporte
 * y los filtros dentro de cada una. Antes era un menú de diez tarjetas, ocho
 * de las cuales sólo redirigían al listado de otro módulo; ahora acá viven
 * únicamente los reportes que no existen en ninguna otra pantalla.
 *
 * Cada pestaña es una ruta hija (`app.routes.ts`), no un `signal` de pestaña
 * activa: así el reporte con sus filtros es enlazable y recargar no vuelve al
 * primero.
 */
@Component({
  imports: [PageHeadComponent, NoticeComponent, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-reports',
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  protected readonly tabs = computed(() => reportTabsFor(this.currentRole.role()));

  constructor(private readonly currentRole: CurrentRoleService) {}
}
