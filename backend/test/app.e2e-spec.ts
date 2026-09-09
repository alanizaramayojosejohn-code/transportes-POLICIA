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

  it('responde el listado de vehículos', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ vehicles { total items { id plate } } }' })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.vehicles).toHaveProperty('total');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
