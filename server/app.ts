import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from '../shared/schemas/config.js';
import { logger } from './lib/logger.js';
import { healthPlugin } from './plugins/health.js';
import { configPlugin } from './plugins/config.js';
import { staticPlugin } from './plugins/static.js';

/**
 * Build the Fastify app (CONTEXT.md D-52, D-53).
 * Plugins registered by domain: health (public) → config (/api/config) → static (SPA catch-all).
 * setErrorHandler returns JSON errors on /api/* with stack traces masked in production (D-58).
 */
export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger as any,
  });

  // Decorate with config so plugins can read it (PAT lives here, never serialized to client).
  app.decorate('config', config);

  // JSON error handler for /api/* (D-58): mask 500 stack traces in production.
  app.setErrorHandler((err, req, reply) => {
    const isApi = req.url.startsWith('/api/');
    const status =
      err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number' && err.statusCode >= 400
        ? err.statusCode
        : 500;
    const message =
      status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Внутренняя ошибка сервера'
        : err instanceof Error
          ? err.message
          : String(err);
    if (status >= 500) {
      logger.error({ err, url: req.url }, 'request error');
    }
    return reply.code(status).send({ error: { message, code: status } });
  });

  await app.register(healthPlugin);
  await app.register(configPlugin, { prefix: '' });
  // static is registered last so the wildcard catch-all doesn't shadow /api and /health.
  await app.register(staticPlugin);

  return app;
}
