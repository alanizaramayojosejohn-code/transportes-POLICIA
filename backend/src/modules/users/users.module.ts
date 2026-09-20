import { Module } from '@nestjs/common';
import { PersonnelModule } from '../personnel/personnel.module.js';
import { UsersService } from './users.service.js';
import { UsersResolver } from './users.resolver.js';

@Module({
  imports: [PersonnelModule],
  providers: [UsersResolver, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
