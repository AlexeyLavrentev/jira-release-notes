/**
 * Normalized issue — the clean shape the frontend receives (CONTEXT.md D-12, D-29, D-31, D-32).
 * Empty defaults applied: components/fixVersions are arrays, epic/releaseNote are nullable/empty.
 */
export interface Issue {
  key: string;
  summary: string;
  releaseNote: string;
  issuetype: { name: string; id: string; iconUrl?: string };
  status: { name: string; id: string };
  priority: { name: string; id: string } | null;
  components: { id: string; name: string }[];
  fixVersions: { id: string; name: string; released: boolean }[];
  epic: { key: string; summary: string | null } | null;
  /** Jira user display names; null when unassigned (expanded row detail). */
  assignee?: string | null;
  reporter?: string | null;
  /** Absolute /browse/KEY link built server-side from jiraBaseUrl. */
  url?: string;
  created: string;
  updated: string;
  resolutiondate: string | null;
}

/**
 * Extended issue with rendered HTML for preview (CONTEXT.md D-06).
 * Only /api/issue/:key returns this — search returns plain Issue.
 */
export interface IssueWithRendered extends Issue {
  renderedReleaseNote?: string;
}

/** Search response (CONTEXT.md D-03, D-13). */
export interface SearchResponse {
  issues: Issue[];
  total: number;
  fetched: number;
  truncated: boolean;
}

/** Minimal project info (CONTEXT.md D-04). */
export interface Project {
  key: string;
  name: string;
  projectTypeKey?: string;
  style?: string;
}

/** Minimal version info (CONTEXT.md D-05). */
export interface Version {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
  archived: boolean;
}

/** Error types for unified ErrorResponse (CONTEXT.md D-33). */
export type ErrorType =
  | 'jira_unreachable'
  | 'jira_auth'
  | 'jira_rate_limit'
  | 'jira_server_error'
  | 'jql_syntax'
  | 'timeout'
  | 'unknown';

/** Unified error response (CONTEXT.md D-33). */
export interface ErrorResponse {
  error: {
    message: string;
    code: number;
    type: ErrorType;
    hint?: string;
  };
}
