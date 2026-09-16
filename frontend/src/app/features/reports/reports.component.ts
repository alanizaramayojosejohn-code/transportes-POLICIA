import { Component } from '@angular/core';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { NoticeComponent } from '../../shared/notice/notice.component';

/** Placeholder de Reportes: la maqueta define 9 sub-reportes + exportación a PDF, aún sin spec
 * ni backend propios. Sólo el encabezado y el menú están en alcance de este rediseño visual. */
@Component({
  imports: [PageHeadComponent, NoticeComponent],
  selector: 'app-reports',
  template: `
    <app-page-head
      title="Reportes"
      description="Reportes operativos del parque automotor y exportación de información."
    />
    <app-notice>
      Este módulo está en construcción. Próximamente permitirá generar y exportar reportes por
      vehículos, recorridos, combustible, mantenimiento, inventario, incidentes y conductores.
    </app-notice>
  `,
})
export class ReportsComponent {}
