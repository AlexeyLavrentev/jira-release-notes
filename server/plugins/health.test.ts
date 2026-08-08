import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

/**
 * Health endpoint tests via Fastify inject() (no real port needed).
 */
describe('health plugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({
      jiraBaseUrl: 'https://jira.example.com',
      jiraPat: 'test-token',
      releaseNoteField: 'customfield_10000',
      port: 3999,
      logLevel: 'silent',
      requestTimeoutMs: 5000,
    });
  });

  it('GET /health returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('GET /api/config returns configured metadata without PAT', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/config' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.configured).toBe(true);
    expect(body.jiraBaseUrl).toBe('https://jira.example.com');
    expect(body.releaseNoteField).toBe('customfield_10000');
    // Critical: PAT must never appear in the response body
    expect(res.body).not.toContain('test-token');
  });
});
