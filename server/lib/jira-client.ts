import type { Config } from '../../shared/schemas/config.js';
import { logger } from './logger.js';
import type { ServerInfo, JiraSearchResponse, JiraRawIssue } from '../../shared/types/jira.js';
import type { SearchBody } from '../../shared/schemas/search.js';
import type { Project, Version } from '../../shared/types/issue.js';

/** Minimum Jira version supporting Personal Access Tokens (PITFALLS.md PITFALL-9). */
export const PAT_MIN_VERSION = { major: 8, minor: 14 };

/** Cap on total issues fetched per search (CONTEXT.md D-08). */
export const ISSUES_CAP = 2000;

/** Page size for Jira search requests (CONTEXT.md D-17). */
const SEARCH_PAGE_SIZE = 100;

/** Retry config for search page fetches (CONTEXT.md D-21). */
const PAGE_RETRY_ATTEMPTS = 3;
const PAGE_RETRY_DELAY_MS = 500;

/**
 * Backend Jira API client (CONTEXT.md D-27, PITFALL-1).
 * Holds the PAT in memory; constructs `Authorization: Bearer` headers only here.
 * The browser never sees the PAT — it calls /api/* which this client serves.
 */
export function createJiraClient(config: Config) {
  const base = config.jiraBaseUrl.replace(/\/+$/, '');
  const timeoutMs = config.requestTimeoutMs;

  async function request<T>(
    path: string,
    opts?: { method?: string; body?: unknown; signal?: AbortSignal },
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // If caller provides an external signal (client disconnect), link it
    if (opts?.signal) {
      opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(`${base}${path}`, {
        method: opts?.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${config.jiraPat}`,
          ...(opts?.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      if (res.status === 401 || res.status === 403) {
        throw new JiraAuthError(`Jira вернула ${res.status}`);
      }
      if (res.status === 400) {
        const errorBody = (await res.json().catch(() => null)) as { errorMessages?: string[] } | null;
        throw new JqlSyntaxError(
          errorBody?.errorMessages?.join('; ') ?? 'JQL syntax error',
        );
      }
      if (!res.ok) {
        throw new JiraUnknownError(`Jira вернула статус ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Search issues with stream-all pagination (CONTEXT.md D-16..D-23).
   * Loops startAt += actualMaxResults until total reached or cap hit.
   */
  async function searchIssues(
    jql: string,
    signal?: AbortSignal,
  ): Promise<{ response: JiraSearchResponse; capped: boolean }> {
    const fields =
      '*navigable,summary,issuetype,status,priority,components,fixVersions,created,updated,resolutiondate,parent';
    const allIssues: JiraRawIssue[] = [];
    let startAt = 0;
    let total = 0;
    let actualMaxResults = SEARCH_PAGE_SIZE;

    for (;;) {
      const body = { jql, startAt, maxResults: SEARCH_PAGE_SIZE, fields };
      const page = await fetchWithRetry(
        () => request<JiraSearchResponse>('/rest/api/2/search', { method: 'POST', body, signal }),
        PAGE_RETRY_ATTEMPTS,
        PAGE_RETRY_DELAY_MS,
      );

      total = page.total;
      actualMaxResults = page.maxResults || SEARCH_PAGE_SIZE; // D-22: read response maxResults
      allIssues.push(...page.issues);

      const fetched = startAt + page.issues.length;
      if (page.issues.length === 0) break; // no more results
      if (fetched >= total) break; // all fetched
      if (allIssues.length >= ISSUES_CAP) {
        // D-19: cap reached — truncate
        return {
          response: {
            startAt: 0,
            maxResults: actualMaxResults,
            total,
            issues: allIssues.slice(0, ISSUES_CAP),
          },
          capped: true,
        };
      }
      startAt += actualMaxResults; // use actual to avoid skipping (D-22)
    }

    return {
      response: { startAt: 0, maxResults: actualMaxResults, total, issues: allIssues },
      capped: false,
    };
  }

  return {
    /** GET /rest/api/2/serverInfo — version + reachability check. */
    async getServerInfo(): Promise<ServerInfo> {
      return request<ServerInfo>('/rest/api/2/serverInfo');
    },

    /** GET /rest/api/2/project — list accessible projects (D-04). */
    async getProjects(): Promise<Project[]> {
      const raw = await request<
        Array<{ key: string; name: string; projectTypeKey?: string; style?: string }>
      >('/rest/api/2/project');
      return raw.map((p) => ({ key: p.key, name: p.name, projectTypeKey: p.projectTypeKey, style: p.style }));
    },

    /** GET /rest/api/2/project/KEY/versions — versions for a project (D-05). */
    async getVersions(projectKey: string): Promise<Version[]> {
      const raw = await request<
        Array<{ id: string; name: string; released: boolean; releaseDate?: string; archived: boolean }>
      >(`/rest/api/2/project/${encodeURIComponent(projectKey)}/versions`);
      return raw.map((v) => ({
        id: v.id,
        name: v.name,
        released: v.released,
        releaseDate: v.releaseDate,
        archived: v.archived,
      }));
    },

    /** GET /rest/api/2/issue/KEY — single issue with renderedFields (D-06, D-09). */
    async getIssue(key: string): Promise<JiraRawIssue> {
      const fields =
        '*navigable,summary,issuetype,status,priority,components,fixVersions,created,updated,resolutiondate,parent';
      return request<JiraRawIssue>(
        `/rest/api/2/issue/${encodeURIComponent(key)}?fields=${encodeURIComponent(fields)}&expand=renderedFields`,
      );
    },

    /** Discover Epic Link custom field ID (D-26). Returns null if not found. */
    async discoverEpicLinkField(): Promise<string | null> {
      try {
        const fields = await request<
          Array<{ id: string; name: string; custom: boolean }>
        >('/rest/api/2/field');
        const epic = fields.find((f) => f.name === 'Epic Link' && f.custom);
        return epic?.id ?? null;
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'Epic Link field discovery failed',
        );
        return null;
      }
    },

    searchIssues,
  };
}

/**
 * Build JQL from a structured search body (CONTEXT.md D-02, D-15).
 * Always appends ORDER BY resolution DESC, priority DESC.
 */
export function buildJql(body: SearchBody): string {
  let jql: string;
  switch (body.mode) {
    case 'jql':
      jql = body.jql ?? `project = ${escapeJql(body.project)}`;
      break;
    case 'fixVersion':
      jql = `project = ${escapeJql(body.project)} AND fixVersion = ${escapeJqlValue(body.fixVersion ?? '')}`;
      break;
    case 'dateRange': {
      const parts = [`project = ${escapeJql(body.project)}`];
      if (body.dateFrom) parts.push(`resolutiondate >= ${escapeJqlValue(body.dateFrom)}`);
      if (body.dateTo) parts.push(`resolutiondate <= ${escapeJqlValue(body.dateTo)}`);
      jql = parts.join(' AND ');
      break;
    }
  }
  return `${jql} ORDER BY resolution DESC, priority DESC`;
}

/** Escape a bare identifier (project key) for JQL. */
function escapeJql(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '');
}

/** Escape a quoted value for JQL (version name, date). */
function escapeJqlValue(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

/** Retry wrapper for page fetches (CONTEXT.md D-21). */
async function fetchWithRetry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Don't retry on JQL syntax errors or auth errors — they won't fix themselves
      if (err instanceof JqlSyntaxError || err instanceof JiraAuthError) throw err;
      if (i < attempts - 1) {
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
export class JqlSyntaxError extends Error {}

/** Log-safe: never includes the PAT. The logger redaction is the backstop. */
export function logJiraError(err: unknown, context: string) {
  logger.warn({ err: err instanceof Error ? err.message : String(err), context }, 'jira request failed');
}
