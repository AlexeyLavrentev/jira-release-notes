import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { toPublicConfig } from '../lib/config.js';

/**
 * GET /api/config — returns safe metadata only (CONTEXT.md D-19).
 * The PAT is NEVER included — toPublicConfig strips it. This endpoint is the
 * security boundary: it must never leak jiraPat.
 */
export const configPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/config', async () => toPublicConfig(app.config));
};
