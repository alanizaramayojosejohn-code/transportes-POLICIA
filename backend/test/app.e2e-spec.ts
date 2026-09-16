import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

// `supertest@7.2.2` dejó de traer su propio `types.d.ts` (el que el
// schematic de Nest 12 importa como `supertest/types`); sin ese archivo el
// subpath no resuelve y rompe el typecheck. Se usa `INestApplication` sin el
// genérico en vez de perseguir un import que el paquete ya no ofrece.
describe('GraphQL (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('responde el listado de vehículos para un usuario autenticado', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query:
          'mutation($input: LoginInput!) { login(input: $input) { accessToken } }',
        variables: { input: { username: 'admin', password: 'Temporal2026' } },
      });
    const accessToken: string = loginResponse.body.data.login.accessToken;

    return request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ query: '{ vehicles { total items { id plate } } }' })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.vehicles).toHaveProperty('total');
      });
  });

  it('rechaza una consulta sin token de acceso', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ vehicles { total items { id plate } } }' })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeDefined();
        expect(res.body.data).toBeNull();
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
