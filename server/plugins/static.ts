import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync } from 'fastify';

/**
 * Serves the built React SPA (CONTEXT.md D-02, D-53).
 * In production the built client/dist sits relative to the server module.
 * The wildcard catch-all enables client-side routing (SPA mode).
 */
export const staticPlugin: FastifyPluginAsync = async (app) => {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/plugins/static.js → ../../client/dist (prod build layout)
  const root = resolve(here, '..', '..', 'client', 'dist');

  await app.register(fastifyStatic, {
    root,
    prefix: '/',
    wildcard: true,
  });
};
