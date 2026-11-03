import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';

interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface ContextPackItem {
  id: string;
  slug: string;
  title: string;
  files?: Array<{ id: string; path: string }>;
  validationGates?: Array<{ id: string; gate: string }>;
}

describe('Auth & Context Packs (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    let accessToken: string;

    it('POST /api/auth/login (Success - SuperAdmin)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '427rohitkumar@gmail.com',
          password: '427rohit@',
        })
        .expect(200);

      const body = response.body as AuthLoginResponse;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe('427rohitkumar@gmail.com');
      expect(body.user.role).toBe('ADMIN');

      accessToken = body.accessToken;
    });

    it('POST /api/auth/login (Failure - Wrong Password)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '427rohitkumar@gmail.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('GET /api/auth/me (Success with Bearer Token)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as AuthLoginResponse['user'];
      expect(body.email).toBe('427rohitkumar@gmail.com');
      expect(body.role).toBe('ADMIN');
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('GET /api/auth/me (Unauthorized without token)', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('Context Packs Flow', () => {
    it('GET /api/context-packs (Public)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/context-packs')
        .expect(200);

      const body = response.body as ContextPackItem[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0]).toHaveProperty('slug', 'nextjs-15-app-router');
    });

    it('GET /api/context-packs/:slug (Public Details)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/context-packs/nextjs-15-app-router')
        .expect(200);

      const body = response.body as ContextPackItem;
      expect(body.slug).toBe('nextjs-15-app-router');
      expect(body).toHaveProperty('files');
      expect(body.files?.length).toBeGreaterThanOrEqual(1);
      expect(body).toHaveProperty('validationGates');
      expect(body.validationGates?.length).toBeGreaterThanOrEqual(1);
    });
  });
});
