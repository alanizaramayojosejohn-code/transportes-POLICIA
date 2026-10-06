import { inject, Injector } from '@angular/core';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/cache';
import { from } from '@apollo/client/link';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { provideApollo } from 'apollo-angular';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

/**
 * Cliente Apollo único de la aplicación. `HttpLink` usa `HttpClient` de
 * Angular por debajo, así que `authInterceptor` (token en cada request) se
 * aplica igual que a cualquier llamada REST. `ErrorLink` cierra la sesión
 * cuando el backend rechaza una operación por falta o vencimiento del token
 * (`code: 'UNAUTHENTICATED'`, spec 013 RF-14): los errores de un resolver
 * viajan en el cuerpo GraphQL con HTTP 200, así que un interceptor HTTP no
 * los vería. Sólo dispara si había sesión: un login fallido también produce
 * `UNAUTHENTICATED` y esa pantalla ya maneja su propio error.
 *
 * `AuthService` se resuelve de forma perezosa vía `Injector.get` (no
 * `inject(AuthService)` directo): `AuthService.login` usa `Apollo`, así que
 * inyectarlo de entrada en esta fábrica crea una dependencia circular
 * (`Apollo` espera esta fábrica, que espera `AuthService`, que espera
 * `Apollo`) — Angular la rechaza con `NG0200` al arrancar.
 */
export function provideGraphQL() {
  return provideApollo(() => {
    const httpLink = inject(HttpLink);
    const injector = inject(Injector);

    const errorLink = new ErrorLink(({ error }) => {
      const auth = injector.get(AuthService);
      if (!auth.isAuthenticated() || !CombinedGraphQLErrors.is(error)) {
        return;
      }
      const isUnauthenticated = error.errors.some(
        (gqlError) => (gqlError as { code?: string }).code === 'UNAUTHENTICATED',
      );
      if (isUnauthenticated) {
        void auth.forceLogout();
      }
    });

    return {
      link: from([errorLink, httpLink.create({ uri: environment.graphqlUri })]),
      cache: new InMemoryCache(),
    };
  });
}
