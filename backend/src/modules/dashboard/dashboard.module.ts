import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardResolver } from './dashboard.resolver.js';

@Module({
  providers: [DashboardResolver, DashboardService],
})
export class DashboardModule {}
