import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { CardComponent } from '../../shared/card/card.component';
import { NoticeComponent } from '../../shared/notice/notice.component';
import { ButtonDirective } from '../../shared/button/button.directive';
import { CurrentRoleService } from '../../core/current-role.service';
import { REPORT_CARDS, ReportCard } from './report-card';
import { ReportDetailComponent } from './report-detail/report-detail.component';

/** Menú de reportes (spec 018). El catálogo vive en `report-card.ts`. */
@Component({
  imports: [
    PageHeadComponent,
    CardComponent,
    NoticeComponent,
    ButtonDirective,
    ReportDetailComponent,
  ],
  selector: 'app-reports',
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  protected readonly cards = computed(() => {
    const role = this.currentRole.role();
    return REPORT_CARDS.filter((card) => role !== null && card.roles.includes(role));
  });

  protected readonly detailCard = signal<ReportCard | null>(null);

  constructor(
    private readonly currentRole: CurrentRoleService,
    private readonly router: Router,
  ) {}

  protected open(card: ReportCard): void {
    this.detailCard.set(null);
    void this.router.navigateByUrl(card.path);
  }
}
