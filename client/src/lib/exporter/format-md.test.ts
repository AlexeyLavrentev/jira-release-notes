import { describe, it, expect } from 'vitest';
import { buildMarkdown, pluralizeTask } from './format-md.js';
import type { DocumentDoc } from './types.js';

function makeDoc(overrides: Partial<DocumentDoc> = {}): DocumentDoc {
  return {
    header: { version: '', date: '', total: 1, ...overrides.header },
    groups: overrides.groups ?? [],
  };
}

describe('pluralizeTask (Russian pluralization — UI-SPEC)', () => {
  it.each([
    [1, 'задача'],
    [3, 'задачи'],
    [5, 'задач'],
    [11, 'задач'],
    [21, 'задача'],
    [22, 'задачи'],
    [100, 'задач'],
    [101, 'задача'],
    [111, 'задач'],
    [121, 'задача'],
    [0, 'задач'],
  ])('n=%i → %s', (n, expected) => {
    expect(pluralizeTask(n)).toBe(expected);
  });
});

describe('buildMarkdown — header (D-17)', () => {
  it('emits # Release Notes, version+date on one line (two spaces), total line, --- separator', () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '2026-08-09', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
    });
    const md = buildMarkdown(doc);
    expect(md).toContain('# Release Notes');
    expect(md).toContain('**Версия:** 1.2.3  **Дата:** 2026-08-09'); // exactly TWO spaces
    expect(md).toContain('Всего: 1 задача');
    expect(md).toContain('---');
    // group + item after the separator
    expect(md).toContain('## Bug (1)');
    expect(md).toContain('- PROJ-1: Исправлен краш');
  });

  it('line order: H1, version/date, total, separator, then groups', () => {
    const doc = makeDoc({
      header: { version: '1.0.0', date: '2026-08-09', total: 1 },
      groups: [{ title: 'Bug', count: 1, items: [{ key: 'PROJ-1', text: 'Исправлен краш' }] }],
    });
    const md = buildMarkdown(doc);
    const iH1 = md.indexOf('# Release Notes');
    const iVer = md.indexOf('**Версия:** 1.0.0');
    const iTotal = md.indexOf('Всего:');
    const iSep = md.indexOf('---');
    const iGroup = md.indexOf('## Bug (1)');
    expect(iH1).toBeLessThan(iVer);
    expect(iVer).toBeLessThan(iTotal);
    expect(iTotal).toBeLessThan(iSep);
    expect(iSep).toBeLessThan(iGroup);
  });

  it('only version (no date) → **Версия:** line alone, no **Дата:**', () => {
    const doc = makeDoc({
      header: { version: '1.2.3', date: '', total: 3 },
      groups: [],
    });
    const md = buildMarkdown(doc);
    expect(md).toContain('**Версия:** 1.2.3');
    expect(md).not.toContain('**Дата:**');
    expect(md).toContain('Всего: 3 задачи');
  });

  it('only date (no version) → **Дата:** line alone, no **Версия:**', () => {
    const doc = makeDoc({
      header: { version: '', date: '2026-08-09', total: 3 },
      groups: [],
    });
    const md = buildMarkdown(doc);
    expect(md).toContain('**Дата:** 2026-08-09');
    expect(md).not.toContain('**Версия:**');
  });

  it('empty version AND empty date → still emits H1, total, --- (no version/date line)', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 5 },
      groups: [],
    });
    const md = buildMarkdown(doc);
    expect(md).toContain('# Release Notes');
    expect(md).not.toContain('**Версия:**');
    expect(md).not.toContain('**Дата:**');
    expect(md).toContain('Всего: 5 задач');
    expect(md).toContain('---');
  });

  it('uses correct Russian pluralization in the total line', () => {
    for (const [n, word] of [[1, 'задача'], [3, 'задачи'], [5, 'задач'], [21, 'задача'], [22, 'задачи'], [11, 'задач']] as const) {
      const doc = makeDoc({ header: { version: '', date: '', total: n } });
      expect(buildMarkdown(doc)).toContain(`Всего: ${n} ${word}`);
    }
  });
});

describe('buildMarkdown — groups + items (D-10, D-13)', () => {
  it('renders each group as ## {title} ({count}) + bulleted items', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 2 },
      groups: [
        {
          title: 'Backend',
          count: 2,
          items: [
            { key: 'PROJ-1', text: 'Фикс А' },
            { key: 'PROJ-2', text: 'Фикс Б' },
          ],
        },
      ],
    });
    const md = buildMarkdown(doc);
    expect(md).toContain('## Backend (2)');
    expect(md).toContain('- PROJ-1: Фикс А');
    expect(md).toContain('- PROJ-2: Фикс Б');
  });

  it('renders multiple groups in the order they appear in doc.groups', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 2 },
      groups: [
        { title: 'Bug', count: 1, items: [{ key: 'B-1', text: 'x valid note text' }] },
        { title: 'Story', count: 1, items: [{ key: 'S-1', text: 'y valid note text' }] },
      ],
    });
    const md = buildMarkdown(doc);
    expect(md.indexOf('## Bug (1)')).toBeLessThan(md.indexOf('## Story (1)'));
  });

  it('renders the [ПУСТО]/[ЗАГЛУШКА]/[КОРОТКО] markers as plain text in the item (markers are already in DocItem.text)', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 3 },
      groups: [
        {
          title: 'Bug',
          count: 3,
          items: [
            { key: 'PROJ-1', text: '[ПУСТО] Сводка первая' },
            { key: 'PROJ-2', text: '[ЗАГЛУШКА] Сводка вторая' },
            { key: 'PROJ-3', text: '[КОРОТКО] Сводка третья' },
          ],
        },
      ],
    });
    const md = buildMarkdown(doc);
    expect(md).toContain('- PROJ-1: [ПУСТО] Сводка первая');
    expect(md).toContain('- PROJ-2: [ЗАГЛУШКА] Сводка вторая');
    expect(md).toContain('- PROJ-3: [КОРОТКО] Сводка третья');
  });
});

describe('buildMarkdown — no escaping (D-33)', () => {
  it('does NOT escape markdown metacharacters in note text', () => {
    const doc = makeDoc({
      header: { version: '', date: '', total: 1 },
      groups: [
        {
          title: 'Bug',
          count: 1,
          items: [{ key: 'PROJ-1', text: '# heading\n\n- nested item\n\n*bold* and [link](http://x)' }],
        },
      ],
    });
    const md = buildMarkdown(doc);
    // The raw metacharacters pass through unchanged
    expect(md).toContain('# heading');
    expect(md).toContain('- nested item');
    expect(md).toContain('*bold* and [link](http://x)');
  });
});
