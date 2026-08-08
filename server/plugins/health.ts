import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

/**
 * Health endpoints (CONTEXT.md D-46).
 * - GET /health — liveness: process alive (public, no Bearer check).
 * - GET /health/ready — readiness: config loaded + Jira reachable.
 *   (Phase 1: config check only. Phase 2 extends to real Jira probe.)
 */
export const healthPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/ready', async (_req, reply) => {
    const config = app.config;
    if (!config?.jiraBaseUrl || !config?.jiraPat) {
      return reply.code(503).send({ ready: false, reason: 'config not loaded' });
    }
    return reply.code(200).send({ ready: true });
  });
};
