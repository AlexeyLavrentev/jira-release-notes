import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from '../shared/schemas/config.js';
import { logger } from './lib/logger.js';
import { createJiraClient } from './lib/jira-client.js';
import { healthPlugin } from './plugins/health.js';
import { configPlugin } from './plugins/config.js';
import { jiraPlugin } from './plugins/jira.js';
import { staticPlugin } from './plugins/static.js';

/**
 * Build the Fastify app (CONTEXT.md D-52, D-53).
 * Plugins by domain: health (public) → config (/api/config) → jira (/api/*) → static (SPA catch-all).
 */
export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger as any,
  });

  app.decorate('config', config);
  app.decorate('jiraClient', createJiraClient(config));

  app.setErrorHandler((err, req, reply) => {
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
  await app.register(configPlugin);
  await app.register(jiraPlugin);
  await app.register(staticPlugin);

  return app;
}
