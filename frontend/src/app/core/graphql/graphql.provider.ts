import { inject } from '@angular/core';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/cache';
import { provideApollo } from 'apollo-angular';
import { environment } from '../../../environments/environment';

/**
 * Cliente Apollo único de la aplicación. `HttpLink` usa `HttpClient` de
 * Angular por debajo, así que los interceptores (por ejemplo, el que añadirá
 * el JWT a cada request) se aplican igual que a cualquier llamada REST.
 */
export function provideGraphQL() {
  return provideApollo(() => {
    const httpLink = inject(HttpLink);
    return {
      link: httpLink.create({ uri: environment.graphqlUri }),
      cache: new InMemoryCache(),
    };
  });
}
