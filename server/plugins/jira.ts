import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { meetsPatRequirement } from '../lib/jira-client.js';
import type { ConnectionStatus } from '../../shared/types/jira.js';

/**
 * GET /api/connection-status — real Jira reachability + version check (CONTEXT.md D-33).
 * PAT requirement: Jira >= 8.14 (PITFALLS.md PITFALL-9).
 * Errors carry Russian messages + actionable hints (D-36).
 */
export const jiraPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/api/connection-status', async () => {
    try {
      const info = await app.jiraClient.getServerInfo();
      const ok = meetsPatRequirement(info.version);
      const status: ConnectionStatus = {
        connected: true,
        jiraVersion: info.version,
        meetsPatRequirement: ok,
      };
      if (!ok) {
        status.error = {
          type: 'version_too_old',
          message: `Jira ${info.version} < 8.14`,
          hint: 'PAT требует Jira 8.14+. Обновите Jira.',
        };
      }
      return status;
    } catch (err) {
      return errorStatus(err);
    }
  });
};

function errorStatus(err: unknown): ConnectionStatus {
  const msg = err instanceof Error ? err.message : String(err);
  // Network / abort errors → unreachable
  if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
    return {
      connected: false,
      meetsPatRequirement: false,
      error: {
        type: 'unreachable',
        message: 'Jira недоступна',
        hint: 'Проверьте JIRA_BASE_URL и сетевую доступность Jira.',
      },
    };
  }
  // Auth errors (401/403 from JiraAuthError)
  if (msg.includes('401') || msg.includes('403')) {
    return {
      connected: false,
      meetsPatRequirement: false,
      error: {
        type: 'auth_failed',
        message: 'PAT невалиден',
        hint: 'Проверьте JIRA_PAT — токен отклонён Jira.',
      },
    };
  }
  return {
    connected: false,
    meetsPatRequirement: false,
    error: { type: 'unknown', message: msg, hint: 'См. логи приложения.' },
  };
}
