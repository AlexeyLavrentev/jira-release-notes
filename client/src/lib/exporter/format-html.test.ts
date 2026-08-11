import { describe, it, expect } from 'vitest';
import { buildHtml } from './format-html.js';
import type { DocumentDoc } from './types.js';

function makeDoc(overrides: Partial<DocumentDoc> = {}): DocumentDoc {
  return {
    header: { version: '', date: '', total: 1, ...overrides.header },
    groups: overrides.groups ?? [],
    missingNotes: overrides.missingNotes ?? [],
  };
}

/**
 * Parse the body of an exported standalone HTML string via DOMParser (jsdom provides it), so XSS
 * assertions can walk the rendered DOM the same way a browser would interpret the file.
 */
function parseBody(html: string): Document {
  // jsdom exposes DOMParser globally in the vitest jsdom environment.
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, 'text/html');
  return dom;
}

describe('buildHtml — standalone document structure (D-24, EXP-03)', () => {
  it('starts with <!DOCTYPE html> and contains <html>, <head>, <body>, and a <style> block', async () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
    });
    const html = await buildHtml(doc);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
    expect(html).toContain('<style>');
    expect(html).toContain('</style>');
  });

  it('renders an <h1>Release Notes</h1> and the rendered content in the body', async () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
    });
    const html = await buildHtml(doc);
    const dom = parseBody(html);
    const h1 = dom.querySelector('body h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe('Release Notes');
    // The group renders as an <h2> and an item as a <li> in the body.
    expect(dom.querySelector('body h2')?.textContent).toContain('Bug');
    expect(dom.querySelector('body li')?.textContent).toContain('PROJ-1');
  });

  it('version/date/total from the header render into the body', async () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 1 },
      groups: [],
    });
    const html = await buildHtml(doc);
    const body = parseBody(html).body.textContent ?? '';
    expect(body).toContain('Версия: 1.2.3');
    expect(body).toContain('Дата: 2026-08-09');
    expect(body).toContain('Всего: 1 задача');
  });
});

describe('buildHtml — XSS sanitization (T-05-03, rehype-sanitize defaultSchema)', () => {
  it('strips a <script> tag from a note so no <script> appears after <body> opens', async () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 1 },
      groups: [
        {
          title: 'Bug',
          count: 1,
          items: [{ key: 'PROJ-1', text: '<script>alert(1)</script> Видимая часть заметки' }],
        },
      ],
    });
    const html = await buildHtml(doc);
    const bodyOpen = html.indexOf('<body>');
    const tail = bodyOpen >= 0 ? html.slice(bodyOpen) : html;
    expect(tail).not.toContain('<script>');
    // The non-script text survives (rehype-sanitize keeps the text node, drops the element).
    const dom = parseBody(html);
    expect(dom.body.textContent).toContain('Видимая часть заметки');
  });

  it('strips the onerror attribute from an <img> injected via a note', async () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 1 },
      groups: [
        {
          title: 'Bug',
          count: 1,
          items: [{ key: 'PROJ-1', text: '<img src=x onerror=alert(1)>' }],
        },
      ],
    });
    const html = await buildHtml(doc);
    // No onerror anywhere in the output (the string-level guarantee the plan requires).
    expect(html).not.toContain('onerror');
    // And specifically no element in the rendered body carries an onerror attribute. rehype-sanitize
    // defaultSchema drops the dangerous attribute entirely (and in fact drops <img> itself, since
    // img is not in the default tagNames) — either way, the security property holds.
    const dom = parseBody(html);
    const body = dom.body;
    expect(body.querySelectorAll('[onerror]').length).toBe(0);
  });
});

describe('buildHtml — missing section rides buildMarkdown (D-12, EXPORT-02)', () => {
  it('renders the «Нет release note» section + missing item key in the sanitized HTML body (no source change to format-html.ts)', async () => {
    // The architecture promise: buildHtml pipes buildMarkdown through remark→rehype→rehypeSanitize→
    // rehypeStringify. Since buildMarkdown now emits the missing section, buildHtml renders it with
    // zero code changes. This test proves the section survives the sanitize pipeline.
    const doc = makeDoc({
      header: { version: '', date: '', total: 0 },
      groups: [],
      missingNotes: [{ key: 'PROJ-1', summary: 'Краш при загрузке', category: 'short' }],
    });
    const html = await buildHtml(doc);
    const body = parseBody(html).body.textContent ?? '';
    // The section heading text survives.
    expect(body).toContain('Нет release note');
    // The missing item's key survives.
    expect(body).toContain('PROJ-1');
  });
});
