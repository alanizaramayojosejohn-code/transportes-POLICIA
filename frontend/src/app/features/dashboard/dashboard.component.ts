import { Component, computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DashboardService } from './dashboard.service';
import { DashboardSummary } from './dashboard.model';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { CardComponent } from '../../shared/card/card.component';
import { StatCardComponent } from '../../shared/stat-card/stat-card.component';

const MONTH_LABEL = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const EMPTY_SUMMARY: DashboardSummary = {
  vehicleCount: 0,
  operationalVehicleCount: 0,
  activeDriverCount: 0,
  tripsThisMonthCount: 0,
  openTripsCount: 0,
  lowStockCount: 0,
  inProgressMaintenanceCount: 0,
  tripsByMonth: [],
  fleetStatus: { operational: 0, maintenance: 0, inoperable: 0, other: 0 },
};

/** Panel principal (spec 012): sólo lectura, agregados en tiempo real. */
@Component({
  imports: [PageHeadComponent, CardComponent, StatCardComponent],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  protected readonly summary: Signal<DashboardSummary>;

  protected readonly maxMonthlyTrips = computed(() =>
    Math.max(1, ...this.summary().tripsByMonth.map((m) => m.count)),
  );

  protected readonly monthlyBars = computed(() =>
    this.summary().tripsByMonth.map((entry) => ({
      label: MONTH_LABEL[Number(entry.month.split('-')[1]) - 1],
      count: entry.count,
      heightPercent: Math.round((entry.count / this.maxMonthlyTrips()) * 100),
    })),
  );

  protected readonly fleetTotal = computed(() => {
    const { operational, maintenance, inoperable, other } = this.summary().fleetStatus;
    return Math.max(1, operational + maintenance + inoperable + other);
  });

  protected readonly fleetPercents = computed(() => {
    const total = this.fleetTotal();
    const { operational, maintenance, inoperable, other } = this.summary().fleetStatus;
    return {
      operational: Math.round((operational / total) * 100),
      maintenance: Math.round((maintenance / total) * 100),
      inoperable: Math.round((inoperable / total) * 100),
      other: Math.round((other / total) * 100),
    };
  });

  protected readonly donutGradient = computed(() => {
    const p = this.fleetPercents();
    const c1 = p.operational;
    const c2 = c1 + p.maintenance;
    const c3 = c2 + p.inoperable;
    return `conic-gradient(var(--color-green-600) 0 ${c1}%, var(--color-amber) ${c1}% ${c2}%, var(--color-red) ${c2}% ${c3}%, var(--color-gray) ${c3}% 100%)`;
  });

  constructor(private readonly dashboardService: DashboardService) {
    this.summary = toSignal(this.dashboardService.getSummary(), {
      initialValue: EMPTY_SUMMARY,
    });
  }
}
