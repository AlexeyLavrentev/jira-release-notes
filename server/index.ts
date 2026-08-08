import { buildApp } from './app.js';
import { loadConfig } from './lib/config.js';
import { logger } from './lib/logger.js';

/**
 * Entry point (CONTEXT.md D-50): config validation happens BEFORE listen().
 * If config is invalid, loadConfig exits 1 with a clear message.
 * On SIGTERM/SIGINT, Fastify closes gracefully (D-59).
 */
async function main() {
  const config = loadConfig();
  logger.info(
    { jiraBaseUrl: config.jiraBaseUrl, releaseNoteField: config.releaseNoteField },
    'config loaded (PAT masked)',
  );

  const app = await buildApp(config);

  // Graceful shutdown (D-59).
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info({ port: config.port }, 'ready');
  } catch (err) {
    logger.error({ err }, 'failed to start');
    process.exit(1);
  }
}

main();
