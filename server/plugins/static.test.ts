import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { staticPlugin } from './static.js';

/**
 * SPA fallback tests (G-11-2): deep links (/select, /edit/KEY, /export) must serve
 * index.html, while unmatched /api/* paths must stay JSON 404 with the error envelope.
 * Uses a tmpdir fixture via `spaRoot` — no dependency on the real (gitignored) client/dist.
 */
describe('static plugin SPA fallback', () => {
  let app: FastifyInstance;
  let fixtureDir: string;

  beforeAll(async () => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'rn-spa-'));
    writeFileSync(
      join(fixtureDir, 'index.html'),
      '<!doctype html><html><body>SPA-INDEX-MARKER-11-02</body></html>',
    );
    writeFileSync(join(fixtureDir, 'test-asset.js'), 'console.log("fixture-asset");\n');

    app = Fastify({ logger: false });
    app.get('/api/real', async () => ({ ok: true }));
    await app.register(staticPlugin, { spaRoot: fixtureDir });
  });

  afterAll(async () => {
    await app.close();
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('GET /select serves index.html (deep link, no query)', async () => {
    const res = await app.inject({ method: 'GET', url: '/select' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.body).toContain('SPA-INDEX-MARKER-11-02');
  });

  it('GET /edit/KEY-1 serves index.html (editor deep link)', async () => {
    const res = await app.inject({ method: 'GET', url: '/edit/KEY-1' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.body).toContain('SPA-INDEX-MARKER-11-02');
  });

  it('GET /edit/KEY-1?project=K4&mode=jql&jql=... serves index.html (query string survives)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/edit/KEY-1?project=K4&mode=jql&jql=project+%3D+K4',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/html/);
    expect(res.body).toContain('SPA-INDEX-MARKER-11-02');
  });

  it('GET /api/missing-endpoint returns JSON 404 with error envelope (not HTML)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/missing-endpoint' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(404);
    expect(body.error.message).toMatch(/not found/i);
  });

  it('real /api routes still match before the fallback', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/real' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('static asset serving is not broken: / serves index.html, /test-asset.js serves JS', async () => {
    const page = await app.inject({ method: 'GET', url: '/' });
    expect(page.statusCode).toBe(200);
    expect(page.headers['content-type']).toMatch(/^text\/html/);
    expect(page.body).toContain('SPA-INDEX-MARKER-11-02');

    const asset = await app.inject({ method: 'GET', url: '/test-asset.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['content-type']).toMatch(/^application\/javascript/);
  });
});
