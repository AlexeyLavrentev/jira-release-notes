import { describe, it, expect } from 'vitest';
import { buildPlain } from './format-plain.js';
import type { DocumentDoc } from './types.js';

function makeDoc(overrides: Partial<DocumentDoc> = {}): DocumentDoc {
  return {
    header: { version: '', date: '', total: 1, ...overrides.header },
    groups: overrides.groups ?? [],
    missingNotes: overrides.missingNotes ?? [],
  };
}

describe('buildPlain — header (D-23, D-17 — markdown markers stripped)', () => {
  it('emits Release Notes, version+date on one line (two spaces), total line, NO markdown markers', () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
    });
    const plain = buildPlain(doc);
    expect(plain).toContain('Release Notes');
    expect(plain).toContain('Версия: 1.2.3  Дата: 2026-08-09'); // exactly TWO spaces, no ** bold markers
    expect(plain).toContain('Всего: 1 задача'); // Russian pluralization reused
  });

  it('does NOT emit any markdown markers (no "# ", "**", "- " prefixes anywhere)', () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
    });
    const plain = buildPlain(doc);
    // No heading/bold/bullet markdown structural markers that buildMarkdown adds.
    expect(plain).not.toContain('# ');
    expect(plain).not.toContain('**');
    // No "- " bullet prefix — items are indented with two spaces instead.
    expect(plain).not.toMatch(/^- /m);
    expect(plain).not.toMatch(/\n- /);
  });

  it('group header is "Bug (1)" with NO "## " prefix, followed by two-space-indented items', () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
    });
    const plain = buildPlain(doc);
    expect(plain).toContain('Bug (1)');
    expect(plain).not.toContain('## Bug');
    // Two-space indent, no bullet prefix.
    expect(plain).toContain('  PROJ-1: Исправлен краш');
    expect(plain).not.toContain('- PROJ-1');
  });

  it('groups are separated by a blank line from the header and from each other', () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 2 },
      groups: [
        { title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Первая правка текста' }] },
        { title: 'Story', count: 1, items: [{ key: 'PROJ-2', text: 'Вторая правка текста' }] },
      ],
    });
    const plain = buildPlain(doc);
    // Blank line between the total line and the first group header.
    expect(plain).toMatch(/Всего:[^\n]*\n\nBug \(1\)/);
    // Blank line between the two groups.
    expect(plain).toMatch(/Первая правка текста\n\nStory \(1\)/);
  });
});

describe('buildPlain — empty version/date (D-17 partial header)', () => {
  it('omits version/date lines but keeps Release Notes + Всего + blank-line separator', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 5 },
      groups: [{ title: 'Bug', count: 5, items: [{ key: 'B-1', text: 'Заметка текст' }] }],
    });
    const plain = buildPlain(doc);
    expect(plain).toContain('Release Notes');
    expect(plain).not.toContain('Версия:');
    expect(plain).not.toContain('Дата:');
    expect(plain).toContain('Всего: 5 задач');
    // Header still separated from the first group by a blank line.
    expect(plain).toMatch(/Всего:[^\n]*\n\nBug \(5\)/);
  });

  it('only version → "Версия:" line alone, no "Дата:"', () => {
    const doc = makeDoc({ header: { version: '9.9', date: '', total: 1 } });
    const plain = buildPlain(doc);
    expect(plain).toContain('Версия: 9.9');
    expect(plain).not.toContain('Дата:');
  });

  it('only date → "Дата:" line alone, no "Версия:"', () => {
    const doc = makeDoc({ header: { version: '', date: '2026-12-31', total: 1 } });
    const plain = buildPlain(doc);
    expect(plain).toContain('Дата: 2026-12-31');
    expect(plain).not.toContain('Версия:');
  });
});

describe('buildPlain — note text is not escaped (D-33)', () => {
  it('passes note text through unchanged — markers in note content are kept as plain text', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 1 },
      groups: [
        {
          title: 'Bug',
          count: 1,
          items: [{ key: 'PROJ-1', text: '[ПУСТО] Сводка с символами * # и [link]' }],
        },
      ],
    });
    const plain = buildPlain(doc);
    // The note content survives verbatim; buildPlain does not strip symbols inside item text.
    expect(plain).toContain('  PROJ-1: [ПУСТО] Сводка с символами * # и [link]');
  });
});

describe('buildPlain — missing section (D-02/D-12, EXPORT-02)', () => {
  it('emits "Нет release note (N)" header + two-space-indented items with lowercase labels', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 0 },
      groups: [],
      missingNotes: [{ key: 'PROJ-1', summary: 'Краш', category: 'empty' }],
    });
    const plain = buildPlain(doc);
    // Header line with the count — NO markdown '## ' prefix (plain text).
    expect(plain).toContain('Нет release note (1)');
    expect(plain).not.toContain('## Нет release note');
    // Two-space-indented item, NO '- ' bullet, lowercase [пусто] label (D-10).
    expect(plain).toContain('  PROJ-1: Краш [пусто]');
    expect(plain).not.toContain('- PROJ-1');
  });

  it('OMITS the missing section entirely when missingNotes is empty (D-17)', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
      missingNotes: [],
    });
    const plain = buildPlain(doc);
    expect(plain).not.toContain('Нет release note');
  });

  it('emits missing items in doc.missingNotes order (already sorted by categoryPriority upstream)', () => {
    // missingNotes arrives pre-sorted by buildDocumentDoc (D-11: empty → short → placeholder).
    const doc = makeDoc({
      header: { version: '', date: '', total: 0 },
      groups: [],
      missingNotes: [
        { key: 'E-1', summary: 'empty summary', category: 'empty' },
        { key: 'S-1', summary: 'short summary', category: 'short' },
        { key: 'P-1', summary: 'placeholder summary', category: 'placeholder' },
      ],
    });
    const plain = buildPlain(doc);
    expect(plain).toContain('Нет release note (3)');
    // Order preserved verbatim from doc.missingNotes.
    const iE = plain.indexOf('E-1');
    const iS = plain.indexOf('S-1');
    const iP = plain.indexOf('P-1');
    expect(iE).toBeLessThan(iS);
    expect(iS).toBeLessThan(iP);
    // Lowercase labels (D-10) for each category.
    expect(plain).toContain('  E-1: empty summary [пусто]');
    expect(plain).toContain('  S-1: short summary [коротко]');
    expect(plain).toContain('  P-1: placeholder summary [заполнение]');
  });

  it('does NOT emit markdown structural markers for the missing section (D-12 plain-text parity)', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 0 },
      groups: [],
      missingNotes: [{ key: 'PROJ-1', summary: 'Краш', category: 'empty' }],
    });
    const plain = buildPlain(doc);
    // No heading '## ' or bullet '- ' for the missing section — mirrors the existing group-item
    // format at line 50 (two-space indent, no bullet).
    expect(plain).not.toMatch(/^## /m);
    expect(plain).not.toMatch(/^- /m);
    expect(plain).not.toMatch(/\n- /);
  });
});
