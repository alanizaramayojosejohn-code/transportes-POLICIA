import { Module } from '@nestjs/common';
import { ProceduresService } from './procedures.service.js';
import {
  ProceduresResolver,
  ProcedureChecklistItemResolver,
} from './procedures.resolver.js';

@Module({
  providers: [
    ProceduresResolver,
    ProcedureChecklistItemResolver,
    ProceduresService,
  ],
  exports: [ProceduresService],
})
export class ProceduresModule {}
