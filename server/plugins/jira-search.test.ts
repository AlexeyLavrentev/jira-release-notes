import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import type { JiraSearchResponse, JiraRawIssue } from '../../shared/types/jira.js';

/**
 * /api/search endpoint tests via Fastify inject().
 * Mocks app.jiraClient to control Jira responses (no real Jira dependency).
 */
describe('POST /api/search', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp(
      {
        jiraBaseUrl: 'https://jira.example.com',
        jiraPat: 'secret-pat-value',
        releaseNoteField: 'customfield_10000',
        port: 3999,
        logLevel: 'silent',
        requestTimeoutMs: 5000,
      },
      null,
    );
  });

  it('returns 400 ErrorResponse for invalid body (missing project)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/search',
      payload: { mode: 'jql' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.type).toBe('jql_syntax');
    expect(body.error.message).toContain('Невалидный');
    // PAT must never appear
    expect(res.body).not.toContain('secret-pat-value');
  });

  it('returns normalized SearchResponse for valid body', async () => {
    const mockIssue: JiraRawIssue = {
      key: 'PROJ-1',
      fields: {
        summary: 'Test issue',
        issuetype: { name: 'Bug', id: '1' },
        status: { name: 'Done', id: '5' },
        priority: { name: 'High', id: '2' },
        components: [{ id: 'c1', name: 'backend' }],
        fixVersions: [{ id: 'v1', name: 'v1.0', released: true }],
        created: '2026-01-01',
        updated: '2026-02-01',
        resolutiondate: '2026-02-01',
        customfield_10000: 'Fixed the bug',
      },
    };
    const mockResponse: JiraSearchResponse = {
      startAt: 0,
      maxResults: 100,
      total: 1,
      issues: [mockIssue],
    };

    // Mock searchIssues
    app.jiraClient.searchIssues = vi.fn().mockResolvedValue({
      response: mockResponse,
      capped: false,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/search',
      payload: { mode: 'jql', project: 'PROJ', jql: 'project = PROJ' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.issues).toHaveLength(1);
    expect(body.issues[0].key).toBe('PROJ-1');
    expect(body.issues[0].releaseNote).toBe('Fixed the bug');
    expect(body.total).toBe(1);
    expect(body.fetched).toBe(1);
    expect(body.truncated).toBe(false);
    // PAT never in response
    expect(res.body).not.toContain('secret-pat-value');
  });

  it('maps JQL syntax error to 400', async () => {
    const { JqlSyntaxError } = await import('../lib/jira-client.js');
    app.jiraClient.searchIssues = vi.fn().mockRejectedValue(new JqlSyntaxError('bad query'));
    const res = await app.inject({
      method: 'POST',
      url: '/api/search',
      payload: { mode: 'jql', project: 'P', jql: 'invalid' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.type).toBe('jql_syntax');
  });

  it('maps auth error to 401', async () => {
    const { JiraAuthError } = await import('../lib/jira-client.js');
    app.jiraClient.searchIssues = vi.fn().mockRejectedValue(new JiraAuthError('401'));
    const res = await app.inject({
      method: 'POST',
      url: '/api/search',
      payload: { mode: 'jql', project: 'P', jql: 'x' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.type).toBe('jira_auth');
  });

  it('marks truncated when total > fetched', async () => {
    const issues: JiraRawIssue[] = Array.from({ length: 100 }, (_, i) => ({
      key: `P-${i}`,
      fields: { summary: `Issue ${i}`, customfield_10000: 'note' },
    }));
    app.jiraClient.searchIssues = vi.fn().mockResolvedValue({
      response: { startAt: 0, maxResults: 100, total: 500, issues },
      capped: false,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/search',
      payload: { mode: 'jql', project: 'P', jql: 'x' },
    });
    const body = res.json();
    expect(body.fetched).toBe(100);
    expect(body.total).toBe(500);
    expect(body.truncated).toBe(true);
  });
});

describe('GET /api/versions', () => {
  it('returns 400 when project missing', async () => {
    const app = await buildApp({
      jiraBaseUrl: 'https://jira.example.com',
      jiraPat: 't',
      releaseNoteField: 'cf',
      port: 1,
      logLevel: 'silent',
      requestTimeoutMs: 1000,
    });
    const res = await app.inject({ method: 'GET', url: '/api/versions' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.type).toBe('jql_syntax');
  });
});
