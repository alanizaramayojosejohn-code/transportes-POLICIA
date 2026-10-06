import { Query, Resolver } from '@nestjs/graphql';
import { DashboardService } from './dashboard.service.js';
import { DashboardSummary } from './entities/dashboard-summary.entity.js';

/** Puerta GraphQL del panel principal (spec 012). Sin restricción de rol. */
@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardSummary, { name: 'dashboardSummary' })
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
