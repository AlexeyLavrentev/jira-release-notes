import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigSchema, type Config } from '../../shared/schemas/config.js';
import type { ConfigResponse } from '../../shared/types/api.js';

/**
 * Load application config with priority: env vars override config.json (CONTEXT.md D-13).
 * Reads from /app/config.json (Docker, D-15) then ./config.json (local dev).
 * Validates via Zod at startup (D-16); on failure logs the field issues and exits 1 (D-25).
 * Config changes apply only on container restart — no hot-reload (D-21).
 */
export function loadConfig(): Config {
  const fileConfig = readConfigFile();

  // Env wins over file (D-13 priority). Env names use JIRA_ prefix for Jira-specific (D-20).
  const merged = {
    jiraBaseUrl: process.env.JIRA_BASE_URL ?? fileConfig?.jiraBaseUrl,
    jiraPat: process.env.JIRA_PAT ?? fileConfig?.jiraPat,
    releaseNoteField:
      process.env.JIRA_RELEASE_NOTE_FIELD ?? fileConfig?.releaseNoteField,
    port: process.env.PORT ?? fileConfig?.port,
    logLevel: process.env.LOG_LEVEL ?? fileConfig?.logLevel,
    requestTimeoutMs:
      process.env.REQUEST_TIMEOUT_MS ?? fileConfig?.requestTimeoutMs,
  };

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues
      .map((i: { path: PropertyKey[]; message: string }) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    // Use console here — logger is created from config; if config is invalid, logger isn't ready.
    console.error(`Configuration validation failed:\n${issues}`);
    console.error(
      'Set the listed values via env vars (JIRA_BASE_URL, JIRA_PAT, ...) or /app/config.json.',
    );
    process.exit(1);
  }

  return result.data;
}

/** Strip secrets — the public view returned by /api/config (D-19). PAT is never exposed. */
export function toPublicConfig(config: Config): ConfigResponse {
  return {
    configured: Boolean(config.jiraBaseUrl && config.jiraPat),
    jiraBaseUrl: config.jiraBaseUrl,
    releaseNoteField: config.releaseNoteField,
  };
}

interface RawConfig {
  jiraBaseUrl?: string;
  jiraPat?: string;
  releaseNoteField?: string;
  port?: number;
  logLevel?: string;
  requestTimeoutMs?: number;
}

function readConfigFile(): RawConfig | undefined {
  const candidates = ['/app/config.json', resolve(process.cwd(), 'config.json')];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf-8');
      return JSON.parse(raw) as RawConfig;
    } catch {
      // File absent or unreadable — try next candidate, then fall back to env-only.
    }
  }
  return undefined;
}
