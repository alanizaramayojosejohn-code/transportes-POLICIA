import { Module } from '@nestjs/common';
import { PersonnelService } from './personnel.service.js';
import { PersonnelResolver } from './personnel.resolver.js';

@Module({
  providers: [PersonnelResolver, PersonnelService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
