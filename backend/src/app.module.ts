import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { UnitsModule } from './modules/units/units.module.js';
import { UnitAssignmentsModule } from './modules/unit-assignments/unit-assignments.module.js';
import { VehicleDriverAssignmentsModule } from './modules/vehicle-driver-assignments/vehicle-driver-assignments.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PersonnelModule } from './modules/personnel/personnel.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { FuelRecordsModule } from './modules/fuel-records/fuel-records.module.js';
import { OdometerReadingsModule } from './modules/odometer-readings/odometer-readings.module.js';
import { MaintenanceOrdersModule } from './modules/maintenance-orders/maintenance-orders.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { VehicleDocumentsModule } from './modules/vehicle-documents/vehicle-documents.module.js';
import { VehiclePhotosModule } from './modules/vehicle-photos/vehicle-photos.module.js';
import { IncidentsModule } from './modules/incidents/incidents.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ProceduresModule } from './modules/procedures/procedures.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

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
        // Expone `req` a los resolvers/guards: JwtAuthGuard, RolesGuard y
        // @CurrentUser() lo usan para leer el usuario autenticado (spec 013).
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

    // Sirve el build de Angular (frontend/dist/web/browser copiado a
    // ./public en la imagen Docker) para poder desplegar todo en un único
    // contenedor. En desarrollo local la carpeta no existe y simplemente no
    // hay nada que servir.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      exclude: ['/graphql'],
    }),

    PrismaModule,
    AuthModule,
    VehiclesModule,
    UnitsModule,
    UnitAssignmentsModule,
    VehicleDriverAssignmentsModule,
    UsersModule,
    PersonnelModule,
    TripsModule,
    FuelRecordsModule,
    OdometerReadingsModule,
    MaintenanceOrdersModule,
    InventoryModule,
    VehicleDocumentsModule,
    VehiclePhotosModule,
    IncidentsModule,
    DashboardModule,
    ReportsModule,
    ProceduresModule,
    // Transversal (spec 019): registra los eventos de todos los módulos
    // anteriores vía interceptor global, sin que ninguno lo importe.
    AuditModule,
  ],
})
export class AppModule {}
