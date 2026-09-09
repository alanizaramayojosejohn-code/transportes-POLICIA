import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'node:path';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { UnitsModule } from './modules/units/units.module.js';
import { UnitAssignmentsModule } from './modules/unit-assignments/unit-assignments.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Code-first: el esquema GraphQL sale de los decoradores de los
    // resolvers y se escribe en disco para poder revisarlo o versionarlo.
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'graphql', 'schema.gql'),
        sortSchema: true,
        playground: config.get<boolean>('graphqlPlayground'),
        introspection: true,
        // Expone `req` a los resolvers/guards. Hoy sólo lo usa RolesGuard
        // para leer el header `x-user-role` (rol simulado sin login real).
        context: ({ req }: { req: unknown }) => ({ req }),
        // No conviene filtrar el stack de un error interno a un cliente; el
        // mensaje sigue viajando, la traza no.
        formatError: (formattedError) => ({
          message: formattedError.message,
          code: formattedError.extensions?.code,
          path: formattedError.path,
        }),
      }),
    }),

    PrismaModule,
    VehiclesModule,
    UnitsModule,
    UnitAssignmentsModule,
  ],
})
export class AppModule {}
