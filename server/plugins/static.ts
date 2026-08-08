import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync } from 'fastify';

/**
 * Serves the built React SPA (CONTEXT.md D-02, D-53).
 * Resolves client/dist relative to the project root (wherever the server runs from).
 * The wildcard catch-all enables client-side routing (SPA mode).
 */
export const staticPlugin: FastifyPluginAsync = async (app) => {
  const here = dirname(fileURLToPath(import.meta.url));
  // Candidate roots: dev (server/plugins/static.ts → ../../client/dist)
  // and prod (server/dist/server/plugins/static.js → ../../../client/dist)
  const candidates = [
    resolve(here, '..', '..', 'client', 'dist'),
    resolve(here, '..', '..', '..', 'client', 'dist'),
    resolve(process.cwd(), 'client', 'dist'),
  ];
  const root = candidates.find((p) => existsSync(p) && statSync(p).isDirectory());

  if (!root) {
    app.log.warn('client/dist not found — SPA will not be served (run npm run build:client)');
    return;
  }

  await app.register(fastifyStatic, {
    root,
    prefix: '/',
    wildcard: true,
  });
};
