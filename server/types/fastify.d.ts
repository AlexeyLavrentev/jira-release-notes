import 'fastify';
import type { Config } from '../../shared/schemas/config.js';

interface JiraClient {
  getServerInfo(): Promise<import('../../shared/types/jira.js').ServerInfo>;
  getProjects(): Promise<import('../../shared/types/issue.js').Project[]>;
  getVersions(projectKey: string): Promise<import('../../shared/types/issue.js').Version[]>;
  getIssue(key: string): Promise<import('../../shared/types/jira.js').JiraRawIssue>;
  discoverEpicLinkField(): Promise<string | null>;
  searchIssues(
    jql: string,
    signal?: AbortSignal,
  ): Promise<{
    response: import('../../shared/types/jira.js').JiraSearchResponse;
    capped: boolean;
  }>;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    jiraClient: JiraClient;
    epicLinkFieldId: string | null;
  }
}
