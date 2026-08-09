import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { buildJql, JiraAuthError, JqlSyntaxError, JiraUnknownError, meetsPatRequirement } from '../lib/jira-client.js';
import { normalizeIssue, getRenderedReleaseNote } from '../lib/normalize.js';
import { SearchBodySchema } from '../../shared/schemas/search.js';
import type { ConnectionStatus } from '../../shared/types/jira.js';
import type { SearchResponse, ErrorResponse, ErrorType, IssueWithRendered } from '../../shared/types/issue.js';

/**
 * Jira proxy endpoints (CONTEXT.md D-01..D-37).
 * - GET  /api/connection-status — version + reachability check (Phase 1)
 * - GET  /api/projects — list accessible projects (D-04)
 * - GET  /api/versions?project=KEY — versions for a project (D-05)
 * - GET  /api/issue/:key — single issue + renderedReleaseNote (D-06)
 * - POST /api/search — structured body → JQL → stream-all pagination (D-02, D-16)
 */
export const jiraPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const releaseNoteField = app.config.releaseNoteField;
  const epicLinkFieldId = app.epicLinkFieldId ?? null;

  // ---- GET /api/connection-status (Phase 1) ----
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
      return errorConnectionStatus(err);
    }
  });

  // ---- GET /api/projects (D-04) ----
  app.get('/api/projects', async (_req, reply) => {
    try {
      return await app.jiraClient.getProjects();
    } catch (err) {
      const e = toErrorResponse(err);
      return reply.code(e.error.code).send(e);
    }
  });

  // ---- GET /api/versions?project=KEY (D-05) ----
  app.get('/api/versions', async (req, reply) => {
    const project = (req.query as { project?: string }).project;
    if (!project) {
      return reply.code(400).send(errorResponse('Не указан проект', 400, 'jql_syntax'));
    }
    try {
      return await app.jiraClient.getVersions(project);
    } catch (err) {
      const e = toErrorResponse(err);
      return reply.code(e.error.code).send(e);
    }
  });

  // ---- GET /api/issue/:key (D-06, D-09 renderedFields) ----
  app.get('/api/issue/:key', async (req, reply) => {
    const { key } = req.params as { key: string };
    try {
      const raw = await app.jiraClient.getIssue(key);
      const issue = normalizeIssue(raw, releaseNoteField, epicLinkFieldId) as IssueWithRendered;
      issue.renderedReleaseNote = getRenderedReleaseNote(raw.renderedFields, releaseNoteField);
      return issue;
    } catch (err) {
      const e = toErrorResponse(err);
      return reply.code(e.error.code).send(e);
    }
  });

  // ---- POST /api/search (D-02, D-13, D-16 stream-all, D-37 AbortSignal) ----
  app.post('/api/search', async (req, reply) => {
    const parsed = SearchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const e = errorResponse(
        `Невалидный запрос: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        400,
        'jql_syntax',
        'Проверьте параметры поиска.',
      );
      return reply.code(400).send(e);
    }

    const jql = buildJql(parsed.data);
    try {
      const { response, capped } = await app.jiraClient.searchIssues(jql, req.signal);
      const issues = response.issues.map((raw) => normalizeIssue(raw, releaseNoteField, epicLinkFieldId));
      const result: SearchResponse = {
        issues,
        total: response.total,
        fetched: issues.length,
        truncated: capped || response.total > issues.length,
      };
      return result;
    } catch (err) {
      const e = toErrorResponse(err);
      return reply.code(e.error.code).send(e);
    }
  });
};

// ---- Error helpers (CONTEXT.md D-33) ----

function errorResponse(message: string, code: number, type: ErrorType, hint?: string): ErrorResponse {
  return { error: { message, code, type, hint } };
}

function toErrorResponse(err: unknown): ErrorResponse {
  if (err instanceof JqlSyntaxError) {
    return errorResponse(`Ошибка в JQL: ${err.message}`, 400, 'jql_syntax', 'Проверьте синтаксис JQL.');
  }
  if (err instanceof JiraAuthError) {
    return errorResponse('Jira отклонила PAT', 401, 'jira_auth', 'Проверьте JIRA_PAT.');
  }
  if (err instanceof JiraUnknownError) {
    return errorResponse('Jira вернула ошибку', 502, 'jira_server_error', 'Проверьте состояние Jira.');
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return errorResponse('Jira не ответила вовремя', 504, 'timeout', 'Запрос превысил время ожидания.');
  }
  if (err instanceof TypeError) {
    return errorResponse('Jira недоступна', 503, 'jira_unreachable', 'Проверьте JIRA_BASE_URL и сеть.');
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Неизвестная ошибка',
    500,
    'unknown',
    'См. логи приложения.',
  );
}

function errorConnectionStatus(err: unknown): ConnectionStatus {
  if (err instanceof JiraAuthError) {
    return {
      connected: false,
      meetsPatRequirement: false,
      error: { type: 'auth_failed', message: 'PAT невалиден', hint: 'Проверьте JIRA_PAT — токен отклонён Jira.' },
    };
  }
  if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
    return {
      connected: false,
      meetsPatRequirement: false,
      error: { type: 'unreachable', message: 'Jira недоступна', hint: 'Проверьте JIRA_BASE_URL и сетевую доступность Jira.' },
    };
  }
  return {
    connected: false,
    meetsPatRequirement: false,
    error: { type: 'unknown', message: err instanceof Error ? err.message : String(err), hint: 'См. логи приложения.' },
  };
}
