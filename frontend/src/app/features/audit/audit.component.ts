import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { AuditService } from './audit.service';
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ACTION_TONE,
  AUDIT_ACTIONS,
  AUDIT_MODULE_LABEL,
  AUDIT_MODULES,
  AuditAction,
  AuditLogEntry,
  AuditLogFilter,
  AuditSummary,
} from './audit.model';
import { AuditDetailComponent } from './audit-detail/audit-detail.component';
import { LIST_PAGE_IMPORTS } from '../../shared/list-page.imports';
import { PAGE_SIZE } from '../../shared/pagination/pagination.component';
import { NoticeComponent } from '../../shared/notice/notice.component';
import { StatCardComponent } from '../../shared/stat-card/stat-card.component';
import { formatDateTimeEs } from '../../shared/date-format';

/**
 * Bitácora de auditoría (spec 019). Exclusiva de ADMINISTRADOR, protegida en
 * `app.routes.ts` y también en el backend (`@Roles('ADMINISTRADOR')`): la
 * auditoría revela la actividad de terceros, así que no basta ocultar el menú.
 *
 * Sólo consulta: el módulo no expone mutations, así que esta pantalla no tiene
 * formularios ni acciones de escritura (RF-12/RF-20).
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, NoticeComponent, StatCardComponent, AuditDetailComponent],
  selector: 'app-audit',
  templateUrl: './audit.component.html',
})
export class AuditComponent {
  protected readonly actions = AUDIT_ACTIONS;
  protected readonly actionLabel = AUDIT_ACTION_LABEL;
  protected readonly actionTone = AUDIT_ACTION_TONE;
  protected readonly modules = AUDIT_MODULES;
  protected readonly moduleLabel = AUDIT_MODULE_LABEL;
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly search = signal('');
  protected readonly module = signal('');
  protected readonly action = signal<AuditAction | ''>('');
  protected readonly date = signal('');

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    module: this.module() || undefined,
    action: this.action() || undefined,
    date: this.date() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<AuditLogFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  protected readonly page: Signal<{ items: AuditLogEntry[]; total: number }>;
  protected readonly summary: Signal<AuditSummary>;

  protected readonly detailEntry = signal<AuditLogEntry | null>(null);

  /// Distingue «todavía no hay eventos» de «los filtros no encontraron nada»:
  /// la auditoría empieza a registrar desde su despliegue, y una tabla vacía no
  /// debe parecer un error (spec 019, «Casos límite»).
  protected readonly hasFilters = computed(
    () => !!(this.search() || this.module() || this.action() || this.date()),
  );

  constructor(private readonly auditService: AuditService) {
    // Se asignan aquí, no como inicializadores de campo: un inicializador se
    // ejecuta antes de que las propiedades de parámetro del constructor queden
    // asignadas (mismo motivo que MyVehicleComponent).
    this.page = toSignal(
      toObservable(this.query).pipe(switchMap((filter) => this.auditService.list(filter))),
      { initialValue: { items: [], total: 0 } },
    );
    this.summary = toSignal(this.auditService.summary(), {
      initialValue: { total: 0, today: 0, created: 0, updated: 0 },
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.module.set('');
    this.action.set('');
    this.date.set('');
  }
}
