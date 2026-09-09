import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CurrentRoleService } from '../current-role.service';

/**
 * Agrega el rol simulado activo como header `x-user-role` a cada petición
 * (incluida GraphQL, que viaja por HttpClient vía HttpLink). Es el mecanismo
 * temporal de permisos mientras no existe login real (ver CurrentRoleService).
 */
export const roleInterceptor: HttpInterceptorFn = (req, next) => {
  const currentRole = inject(CurrentRoleService);
  return next(req.clone({ setHeaders: { 'x-user-role': currentRole.role() } }));
};
