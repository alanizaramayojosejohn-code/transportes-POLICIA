import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service.js';
import { AuditResolver } from './audit.resolver.js';
import { AuditInterceptor } from './audit.interceptor.js';

/**
 * Módulo transversal (spec 019): registra los eventos de los demás módulos sin
 * que ninguno lo importe. El `APP_INTERCEPTOR` se declara acá y no en
 * `AppModule` para que el módulo quede autocontenido — importarlo alcanza para
 * que la auditoría empiece a registrar.
 */
@Module({
  providers: [
    AuditResolver,
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
