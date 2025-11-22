import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Minimal E2E Test Example
 *
 * Shows basic API testing patterns without extensive test suites.
 * Demonstrates:
 * - Application bootstrap in tests
 * - HTTP request testing
 * - Basic response validation
 */
describe('App (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) - should return API info', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('docs');
      });
  });

  it('/api/health (GET) - should return health status', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('status');
        expect(res.body.data).toHaveProperty('timestamp');
      });
  });

  it('/api-docs (GET) - should serve Swagger documentation', () => {
    return request(app.getHttpServer())
      .get('/api-docs')
      .expect(200);
  });
});
