import 'reflect-metadata';
import 'dotenv/config';
import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { json, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { AppModule } from './app.module';
import { getConfig } from './common/config';
import { ProblemFilter } from './common/problem.filter';
import { RateLimitService } from './common/rate-limit';
import { proofChallengeSchema } from './anti-abuse/anti-abuse.controller';

export async function createApplication() {
  const config = getConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const trusted = config.TRUSTED_PROXY_IPS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const server = app.getHttpAdapter().getInstance();
  server.disable('x-powered-by');
  server.set('trust proxy', (ip: string) => trusted.includes(ip));
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (
      trusted.includes(req.socket.remoteAddress ?? '') &&
      typeof req.headers['cf-connecting-ip'] === 'string' &&
      isIP(req.headers['cf-connecting-ip'])
    )
      req.headers['x-forwarded-for'] = req.headers['cf-connecting-ip'];
    next();
  });
  app.use(
    pinoHttp({
      genReqId: (req, res) => {
        const provided = req.headers['x-request-id'];
        const id =
          typeof provided === 'string' && /^[a-f\d-]{36}$/i.test(provided)
            ? provided
            : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          path: String(req.url)
            .split('?')[0]
            .replace(/(\/manage\/)[^/]+/g, '$1[REDACTED]')
            .replace(/(\/calendar-feed\/)[^/]+/g, '$1[REDACTED]'),
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(json({ limit: '256kb' }));
  app.use(cookieParser());
  app.enableCors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'If-Match',
      'X-Requested-With',
      'X-Request-Id',
      'X-Booking-Token',
      'X-Guest-Challenge',
      'X-Guest-Nonce',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'ETag',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
    ],
  });
  const limiter = app.get(RateLimitService);
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    if (
      req.headers.origin &&
      req.headers.origin !== config.WEB_ORIGIN &&
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    )
      return next(new ForbiddenException('Origen de solicitud no permitido.'));
    try {
      if (['/health', '/ready'].includes(req.path)) return next();
      if (req.path.includes('/availability')) await limiter.request(req, res, 'availability', 120);
      else if (req.path.includes('/bookings') && req.method === 'POST')
        await limiter.request(req, res, 'booking', 20);
      else if (req.path.includes('/receipt')) await limiter.request(req, res, 'upload', 20);
      else await limiter.request(req, res, 'global', 300);
      next();
    } catch (error) {
      next(error);
    }
  });
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'ready', method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new ProblemFilter());
  app.enableShutdownHooks();
  if (config.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Reservas Bolivia API')
        .setDescription(
          'Contrato común para web y móvil. Fechas UTC; moneda BOB. Errores application/problem+json.',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    document.components ??= {};
    document.components.schemas ??= {};
    document.components.schemas.Problem = {
      type: 'object',
      required: ['type', 'title', 'status', 'detail', 'code', 'requestId'],
      properties: {
        type: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'integer' },
        detail: { type: 'string' },
        code: { type: 'string' },
        requestId: { type: 'string' },
        instance: { type: 'string' },
        challenge: proofChallengeSchema,
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: { path: { type: 'string' }, message: { type: 'string' } },
          },
        },
      },
    };
    for (const item of Object.values(document.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = item?.[method];
        if (!operation) continue;
        for (const status of ['400', '401', '403', '409', '429', '500'])
          operation.responses[status] ??= {
            description: 'Error uniforme RFC 7807',
            content: {
              'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } },
            },
          };
      }
    }
    SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: '/docs-json' });
  }
  await app.init();
  return app;
}

if (require.main === module) {
  createApplication()
    .then((app) => app.listen(getConfig().PORT, '0.0.0.0'))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : 'API startup failed');
      process.exitCode = 1;
    });
}
