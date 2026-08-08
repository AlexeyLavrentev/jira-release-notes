/**
 * Jira Server/DC REST API types (subset used by Phase 1-2).
 */

/** Subset of GET /rest/api/2/serverInfo response (CONTEXT.md D-33 version check). */
export interface ServerInfo {
  version: string;
  versionNumbers: number[];
  buildNumber: number;
  serverTitle: string;
  baseUrl: string;
}

/** Result of a connection check against Jira. */
export interface ConnectionStatus {
  connected: boolean;
  jiraVersion?: string;
  meetsPatRequirement: boolean;
  error?: {
    type: 'unreachable' | 'auth_failed' | 'version_too_old' | 'unknown';
    message: string;
    hint: string;
  };
}
