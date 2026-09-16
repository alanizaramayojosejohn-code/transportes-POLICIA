import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersResolver } from './users.resolver.js';

@Module({
  providers: [UsersResolver, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
