import type { Config } from '../../shared/schemas/config.js';
import { logger } from './logger.js';
import type { ServerInfo } from '../../shared/types/jira.js';

/** Minimum Jira version supporting Personal Access Tokens (PITFALLS.md PITFALL-9). */
export const PAT_MIN_VERSION = { major: 8, minor: 14 };

/**
 * Backend Jira API client (CONTEXT.md D-27, PITFALL-1).
 * Holds the PAT in memory; constructs `Authorization: Bearer` headers only here.
 * The browser never sees the PAT — it calls /api/* which this client serves.
 */
export function createJiraClient(config: Config) {
  const base = config.jiraBaseUrl.replace(/\/+$/, '');
  const timeoutMs = config.requestTimeoutMs;

  async function request<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${config.jiraPat}` },
        signal: controller.signal,
      });
      if (res.status === 401 || res.status === 403) {
        throw new JiraAuthError(`Jira вернула ${res.status}`);
      }
      if (!res.ok) {
        throw new JiraUnknownError(`Jira вернула статус ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /** GET /rest/api/2/serverInfo — version + reachability check. */
    async getServerInfo(): Promise<ServerInfo> {
      return request<ServerInfo>('/rest/api/2/serverInfo');
    },
  };
}

/** Parse "X.Y.Z" → {major, minor} for the 8.14 PAT check. */
export function parseVersion(version: string): { major: number; minor: number } {
  const parts = version.split('.').map((p) => Number.parseInt(p, 10));
  return { major: parts[0] ?? 0, minor: parts[1] ?? 0 };
}

export function meetsPatRequirement(version: string): boolean {
  const { major, minor } = parseVersion(version);
  if (major > PAT_MIN_VERSION.major) return true;
  if (major < PAT_MIN_VERSION.major) return false;
  return minor >= PAT_MIN_VERSION.minor;
}

export class JiraAuthError extends Error {}
export class JiraUnknownError extends Error {}

/** Log-safe: never includes the PAT. The logger redaction is the backstop. */
export function logJiraError(err: unknown, context: string) {
  logger.warn({ err: err instanceof Error ? err.message : String(err), context }, 'jira request failed');
}
