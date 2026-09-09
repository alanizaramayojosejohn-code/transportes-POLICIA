import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Acceso a la base de datos vía Prisma 7, con el adaptador de driver para
 * PostgreSQL. Prisma 7 ya no incluye el motor de consultas nativo por
 * defecto: el adaptador es quien abre la conexión real a través de `pg`.
 *
 * Extiende `PrismaClient` directamente (a diferencia de xLearn) porque este
 * proyecto no tiene aislamiento multi-tenant que inyectar entre el cliente y
 * los servicios: cada módulo puede llamar `this.prisma.vehicle.findMany()`
 * sin una capa intermedia que lo intercepte.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    super({
      adapter: new PrismaPg(pool),
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado a PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Desconectado de PostgreSQL');
  }
}
