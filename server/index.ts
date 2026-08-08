import { buildApp } from './app.js';
import { loadConfig } from './lib/config.js';
import { logger } from './lib/logger.js';
import { meetsPatRequirement } from './lib/jira-client.js';

/**
 * Entry point (CONTEXT.md D-50): config validation happens BEFORE listen().
 * Pre-listen version check (D-33): Jira < 8.14 → exit(1); unreachable/auth → warn + continue.
 */
async function main() {
  const config = loadConfig();
  logger.info(
    { jiraBaseUrl: config.jiraBaseUrl, releaseNoteField: config.releaseNoteField },
    'config loaded (PAT masked)',
  );

  const app = await buildApp(config);

  // Pre-listen Jira version check. version_too_old is fatal (app is fundamentally incompatible);
  // unreachable/auth are transient — warn and let the status screen show the error.
  try {
    const info = await app.jiraClient.getServerInfo();
    if (!meetsPatRequirement(info.version)) {
      logger.error(
        { jiraVersion: info.version, required: '8.14+' },
        'Jira version too old for PAT — exiting',
      );
      process.exit(1);
    }
    logger.info({ jiraVersion: info.version }, 'Jira version OK');
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'Jira unreachable at startup (continuing — check connection-status screen)',
    );
  }

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
