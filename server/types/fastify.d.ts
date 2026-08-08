import 'fastify';
import type { Config } from '../../shared/schemas/config.js';

interface JiraClient {
  getServerInfo(): Promise<import('../../shared/types/jira.js').ServerInfo>;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    jiraClient: JiraClient;
  }
}
