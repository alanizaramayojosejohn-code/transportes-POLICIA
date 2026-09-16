import { Component } from '@angular/core';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { NoticeComponent } from '../../shared/notice/notice.component';

/** Placeholder de Auditoría: log de eventos del sistema por módulo, aún sin spec ni backend
 * propios. Sólo el encabezado y el menú están en alcance de este rediseño visual. Exclusivo de
 * ADMINISTRADOR (protegido en `app.routes.ts`, igual que Usuarios). */
@Component({
  imports: [PageHeadComponent, NoticeComponent],
  selector: 'app-audit',
  template: `
    <app-page-head title="Auditoría" description="Registro de eventos y cambios del sistema." />
    <app-notice>
      Este módulo está en construcción. Próximamente mostrará el historial de acciones (creaciones,
      modificaciones y bajas) realizadas en cada módulo del sistema.
    </app-notice>
  `,
})
export class AuditComponent {}
