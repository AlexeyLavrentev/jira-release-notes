import { z } from 'zod';

/**
 * Application configuration schema.
 * Validated at backend startup via Zod (CONTEXT.md D-16).
 * Fields map from env vars (JIRA_ prefix, D-20) and/or flat config.json (D-14).
 */
export const ConfigSchema = z.object({
  /** Jira base URL, e.g. https://jira.example.com (required, D-18) */
  jiraBaseUrl: z
    .string()
    .url('jiraBaseUrl must be a valid URL'),
  /** Personal Access Token — held backend-only, never sent to client (D-17, D-19, D-27) */
  jiraPat: z.string().min(1, 'jiraPat is required'),
  /** Custom field ID holding the release note (D-24 default customfield_10000) */
  releaseNoteField: z.string().default('customfield_10000'),
  /** HTTP port (D-18 default 3000) */
  port: z.coerce.number().int().positive().default(3000),
  /** pino log level (D-18 default info) */
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /** Jira API request timeout in ms (D-18 default 30000) */
  requestTimeoutMs: z.coerce.number().int().positive().default(30000),
  /** Short-release-note threshold in chars (CONF-01, Phase 10 D-13). Default 15. min(1): 0 would
   *  make any len>=1 note valid. max(500): sane upper bound. Out-of-range → Zod fail → backend
   *  exit 1 (Phase 1 D-16). z.coerce parses string env values; .default(15) keeps legacy
   *  config.json backward-compatible (Phase 10 D-15). */
  shortThreshold: z.coerce.number().int().min(1).max(500).default(15),
});

export type Config = z.infer<typeof ConfigSchema>;
