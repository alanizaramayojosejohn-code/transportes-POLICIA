import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';

/**
 * Agrega el token de acceso a cada petición (incluida GraphQL, que viaja por
 * HttpClient vía HttpLink). Reemplaza a `role.interceptor.ts`, que mandaba
 * el rol simulado por el header `x-user-role` (spec 013). El cierre de
 * sesión ante un token vencido o rechazado se maneja en `graphql.provider.ts`
 * (`ErrorLink`): los errores de un resolver, aunque sea "no autenticado",
 * viajan en el cuerpo GraphQL con HTTP 200, no como error HTTP.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
