import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

/**
 * Health endpoints (CONTEXT.md D-46).
 * - GET /health — liveness: process alive (public).
 * - GET /health/ready — readiness: config loaded + Jira reachable (Phase 2 real probe).
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
    // Real readiness probe (Phase 2): check Jira reachability.
    try {
      const info = await app.jiraClient.getServerInfo();
      return reply.code(200).send({ ready: true, jiraVersion: info.version });
    } catch (err) {
      const reason =
        err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')
          ? 'jira_unreachable'
          : (err instanceof Error ? err.message : 'unknown');
      return reply.code(503).send({ ready: false, reason });
    }
  });
};
