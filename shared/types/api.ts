/**
 * Safe metadata returned by GET /api/config (CONTEXT.md D-19).
 * The PAT (jiraPat) is NEVER included — it stays in backend memory only.
 */
export interface ConfigResponse {
  /** Whether the backend has a non-empty PAT + base URL configured */
  configured: boolean;
  /** Jira base URL (safe to show) */
  jiraBaseUrl: string;
  /** Custom field ID for the release note (safe to show) */
  releaseNoteField: string;
}
