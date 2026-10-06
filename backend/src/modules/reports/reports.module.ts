import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportsResolver } from './reports.resolver.js';

@Module({
  providers: [ReportsResolver, ReportsService],
})
export class ReportsModule {}
