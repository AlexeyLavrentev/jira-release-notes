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

// ---- Phase 2: raw Jira shapes for search/issue/proj (CONTEXT.md D-01) ----

/** Raw Jira field value — can be string, object, array, or null (PITFALL-4). */
export type JiraFieldValue = string | { value?: string; name?: string } | unknown[] | null | undefined;

/** Raw issue fields object from /rest/api/2/search or /rest/api/2/issue/KEY. */
export interface JiraRawFields {
  summary?: string;
  issuetype?: { name?: string; id?: string; iconUrl?: string };
  status?: { name?: string; id?: string };
  priority?: { name?: string; id?: string } | null;
  components?: { id?: string; name?: string }[] | null;
  fixVersions?: { id?: string; name?: string; released?: boolean }[] | null;
  created?: string;
  updated?: string;
  resolutiondate?: string | null;
  assignee?: { name?: string; displayName?: string } | null;
  reporter?: { name?: string; displayName?: string } | null;
  parent?: { key?: string; fields?: { summary?: string } } | null;
  // Custom fields accessed by dynamic key (customfield_XXXXX) — untyped access via this bag
  [fieldId: string]: unknown;
}

/** Raw rendered fields object (HTML versions) from expand=renderedFields. */
export type JiraRenderedFields = Record<string, string | undefined>;

/** Raw issue from Jira REST API. */
export interface JiraRawIssue {
  id?: string;
  key: string;
  fields: JiraRawFields;
  renderedFields?: JiraRenderedFields;
}

/** Raw /rest/api/2/search response. */
export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraRawIssue[];
}
