import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Global: casi todos los módulos de dominio necesitan PrismaService, y
 * repetir el import en cada uno sólo añadiría ruido.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
