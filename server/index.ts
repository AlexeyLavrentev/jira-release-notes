import { buildApp } from './app.js';
import { loadConfig } from './lib/config.js';
import { logger } from './lib/logger.js';
import { meetsPatRequirement, createJiraClient } from './lib/jira-client.js';

/**
 * Entry point (CONTEXT.md D-50): config validation happens BEFORE listen().
 * Pre-listen: version check (D-33) + Epic Link discovery (D-26).
 */
async function main() {
  const config = loadConfig();
  logger.info(
    { jiraBaseUrl: config.jiraBaseUrl, releaseNoteField: config.releaseNoteField },
    'config loaded (PAT masked)',
  );

  // Discover Epic Link field BEFORE building app (need it for the decorator).
  const tempClient = createJiraClient(config);
  let epicLinkFieldId: string | null = null;
  try {
    epicLinkFieldId = await tempClient.discoverEpicLinkField();
    if (epicLinkFieldId) {
      logger.info({ epicLinkFieldId }, 'Epic Link field discovered');
    } else {
      logger.warn('Epic Link field not found — epic will be null for all issues');
    }
  } catch {
    logger.warn('Epic Link discovery failed — epic will be null for all issues');
  }

  // Version check via temp client.
  try {
    const info = await tempClient.getServerInfo();
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

  const app = await buildApp(config, epicLinkFieldId);

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
