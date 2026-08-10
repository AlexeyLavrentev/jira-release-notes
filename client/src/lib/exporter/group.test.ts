import { describe, it, expect } from 'vitest';
import type { Issue } from '../../../../shared/types/issue';
import {
  groupBy,
  sortGroups,
  resolveNoteText,
  buildDocumentDoc,
  TYPE_GROUP_ORDER,
  NO_COMPONENT_LABEL,
  NO_EPIC_LABEL,
} from './group.js';
import { SKIP_MARKER } from '../validation.js';
import type { GroupingMode } from './types.js';

/** Minimal Issue builder — fills required fields with sane defaults. */
function makeIssue(overrides: Partial<Issue> & { key: string }): Issue {
  return {
    key: overrides.key,
    summary: overrides.summary ?? 'Сводка задачи',
    releaseNote: overrides.releaseNote ?? '',
    issuetype: overrides.issuetype ?? { name: 'Task', id: '3' },
    status: overrides.status ?? { name: 'Closed', id: '1' },
    priority: overrides.priority ?? { name: 'Medium', id: '2' },
    components: overrides.components ?? [],
    fixVersions: overrides.fixVersions ?? [],
    epic: overrides.epic ?? null,
    created: overrides.created ?? '2026-01-01T00:00:00.000+0000',
    updated: overrides.updated ?? '2026-01-02T00:00:00.000+0000',
    resolutiondate: overrides.resolutiondate ?? '2026-01-03',
  };
}

describe('TYPE_GROUP_ORDER constant (D-09)', () => {
  it('is the predefined Epic → Story → Task → Bug order', () => {
    expect(TYPE_GROUP_ORDER).toEqual(['Epic', 'Story', 'Task', 'Bug']);
  });
});

describe('groupBy', () => {
  it('flat: returns ONE group keyed by the flat label, containing ALL issues (D-11)', () => {
    const issues = [
      makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' } }),
      makeIssue({ key: 'P-2', issuetype: { name: 'Story', id: '2' } }),
      makeIssue({ key: 'P-3', issuetype: { name: 'Task', id: '3' } }),
    ];
    const groups = groupBy('flat', issues);
    expect(groups.size).toBe(1);
    const flatKey = [...groups.keys()][0];
    expect(flatKey).toBe('Без групп');
    expect(groups.get(flatKey)!.length).toBe(3);
  });

  it('type: groups in fixed order Epic → Story → Task → Bug → others alphabetical; no zero groups; total preserved (D-09)', () => {
    const issues = [
      makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' } }),
      makeIssue({ key: 'P-2', issuetype: { name: 'Story', id: '2' } }),
      makeIssue({ key: 'P-3', issuetype: { name: 'Epic', id: '3' } }),
      makeIssue({ key: 'P-4', issuetype: { name: 'Task', id: '4' } }),
      makeIssue({ key: 'P-5', issuetype: { name: 'Sub-task', id: '5' } }),
    ];
    const groups = groupBy('type', issues);
    expect([...groups.keys()]).toEqual(['Epic', 'Story', 'Task', 'Bug', 'Sub-task']);
    const total = [...groups.values()].reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBe(issues.length);
  });

  it('type: omits predefined groups that have no issues (no zero-count group)', () => {
    const issues = [makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' } })];
    const groups = groupBy('type', issues);
    expect([...groups.keys()]).toEqual(['Bug']);
  });

  it('type: multiple "other" issuetypes sort alphabetically after the four (D-09)', () => {
    const issues = [
      makeIssue({ key: 'P-1', issuetype: { name: 'Zeta', id: '1' } }),
      makeIssue({ key: 'P-2', issuetype: { name: 'Alpha', id: '2' } }),
      makeIssue({ key: 'P-3', issuetype: { name: 'Bug', id: '3' } }),
    ];
    const groups = groupBy('type', issues);
    expect([...groups.keys()]).toEqual(['Bug', 'Alpha', 'Zeta']);
  });

  it('component: one group per distinct component (alphabetical) + "Без компонента" last (D-09)', () => {
    const issues = [
      makeIssue({ key: 'P-1', components: [{ id: 'c1', name: 'Backend' }] }),
      makeIssue({ key: 'P-2', components: [{ id: 'c2', name: 'Auth' }] }),
      makeIssue({ key: 'P-3', components: [] }),
    ];
    const groups = groupBy('component', issues);
    expect([...groups.keys()]).toEqual(['Auth', 'Backend', NO_COMPONENT_LABEL]);
    expect(NO_COMPONENT_LABEL).toBe('Без компонента');
  });

  it('component: a single issue with two components appears in BOTH component groups (D-09 multi-count)', () => {
    const issues = [
      makeIssue({
        key: 'P-1',
        components: [
          { id: 'c1', name: 'Backend' },
          { id: 'c2', name: 'Frontend' },
        ],
      }),
    ];
    const groups = groupBy('component', issues);
    expect(groups.get('Backend')!.length).toBe(1);
    expect(groups.get('Frontend')!.length).toBe(1);
  });

  it('component: issue with zero components goes only into "Без компонента"', () => {
    const issues = [makeIssue({ key: 'P-1', components: [] })];
    const groups = groupBy('component', issues);
    expect([...groups.keys()]).toEqual([NO_COMPONENT_LABEL]);
  });

  it('epic: one group per epic summary (alphabetical) + "Без эпика" last (D-09)', () => {
    const issues = [
      makeIssue({ key: 'P-1', epic: { key: 'E-1', summary: 'Migration' } }),
      makeIssue({ key: 'P-2', epic: { key: 'E-2', summary: 'Auth' } }),
      makeIssue({ key: 'P-3', epic: null }),
    ];
    const groups = groupBy('epic', issues);
    expect([...groups.keys()]).toEqual(['Auth', 'Migration', NO_EPIC_LABEL]);
    expect(NO_EPIC_LABEL).toBe('Без эпика');
  });

  it('epic: issue with null epic goes only into "Без эпика"', () => {
    const issues = [makeIssue({ key: 'P-1', epic: null })];
    const groups = groupBy('epic', issues);
    expect([...groups.keys()]).toEqual([NO_EPIC_LABEL]);
  });
});

describe('sortGroups', () => {
  it('type: orders group keys by D-09 type order then alphabetical others', () => {
    const keys = sortGroups('type', ['Bug', 'Story', 'Sub-task', 'Epic', 'Task']);
    expect(keys).toEqual(['Epic', 'Story', 'Task', 'Bug', 'Sub-task']);
  });

  it('component: alphabetical with "Без компонента" always last regardless of alphabet', () => {
    const keys = sortGroups('component', [NO_COMPONENT_LABEL, 'Backend', 'Auth']);
    expect(keys).toEqual(['Auth', 'Backend', NO_COMPONENT_LABEL]);
  });

  it('epic: alphabetical with "Без эпика" always last regardless of alphabet', () => {
    // "Без эпика" starts with Б which sorts BEFORE B in Cyrillic, but must still be last
    const keys = sortGroups('epic', [NO_EPIC_LABEL, 'Migration']);
    expect(keys).toEqual(['Migration', NO_EPIC_LABEL]);
  });

  it('flat: returns keys unchanged (single group)', () => {
    const keys = sortGroups('flat', ['Без групп']);
    expect(keys).toEqual(['Без групп']);
  });
});

describe('within-group item sort (D-08, reuses sortIssues)', () => {
  it('default priority DESC orders Highest first within the group', () => {
    const issues = [
      makeIssue({ key: 'P-LOW', priority: { name: 'Low', id: '4' } }),
      makeIssue({ key: 'P-HIGH', priority: { name: 'High', id: '1' } }),
      makeIssue({ key: 'P-MED', priority: { name: 'Medium', id: '2' } }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '');
    const flat = doc.groups[0];
    const keys = flat.items.map((i) => i.key);
    expect(keys).toEqual(['P-HIGH', 'P-MED', 'P-LOW']);
  });
});

describe('resolveNoteText (D-19 edits priority, D-20 markers)', () => {
  it('edited text takes priority over the original releaseNote (D-19)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'original valid note text here', summary: 'S' });
    const out = resolveNoteText(issue, 'edited valid note text here');
    expect(out).toBe('edited valid note text here');
  });

  it('falls back to issue.releaseNote when no edit (undefined)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'a perfectly valid note', summary: 'S' });
    const out = resolveNoteText(issue, undefined);
    expect(out).toBe('a perfectly valid note');
  });

  it('empty resolved note → [ПУСТО] {summary} marker (D-20)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: '', summary: 'Краш при загрузке' });
    expect(resolveNoteText(issue, undefined)).toBe('[ПУСТО] Краш при загрузке');
    expect(resolveNoteText(issue, '   ')).toBe('[ПУСТО] Краш при загрузке');
  });

  it('placeholder resolved note → [ЗАГЛУШКА] {summary} marker (D-20)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'TODO', summary: 'Новая фича' });
    expect(resolveNoteText(issue, undefined)).toBe('[ЗАГЛУШКА] Новая фича');
  });

  it('short resolved note → [КОРОТКО] {summary} marker (D-20)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'ок', summary: 'Мелкий фикс' });
    expect(resolveNoteText(issue, undefined)).toBe('[КОРОТКО] Мелкий фикс');
  });

  it('valid resolved note passes through unchanged (no marker)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'Исправлен краш при загрузке данных', summary: 'S' });
    expect(resolveNoteText(issue, undefined)).toBe('Исправлен краш при загрузке данных');
  });

  it('skip resolved note returns empty string (D-16 defensive case)', () => {
    // Skip issues are filtered out of the document before resolveNoteText runs (buildDocumentDoc),
    // but if one ever leaked through it must return '' rather than emitting the raw marker.
    const issue = makeIssue({ key: 'P-1', releaseNote: SKIP_MARKER, summary: 'S' });
    expect(resolveNoteText(issue, undefined)).toBe('');
  });
});

describe('buildDocumentDoc', () => {
  it('header.total = exportable issue count, NOT summed group items (GROUP-06 — multi-component does not inflate; D-15 — skip excluded)', () => {
    const issues = [
      makeIssue({
        key: 'P-1',
        components: [
          { id: 'c1', name: 'Backend' },
          { id: 'c2', name: 'Frontend' },
        ],
        releaseNote: 'Исправлен краш при загрузке данных',
      }),
    ];
    const doc = buildDocumentDoc('component', issues, {}, 'priority', 'desc', '', '');
    expect(doc.header.total).toBe(1); // exportable count, not 2 (one valid issue, no skip)
    // but the issue appears in two groups
    expect(doc.groups.length).toBe(2);
  });

  it('omits groups with zero items (D-14 — no "## Epic (0)")', () => {
    const issues = [makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' } })];
    const doc = buildDocumentDoc('type', issues, {}, 'priority', 'desc', '', '');
    expect(doc.groups.every((g) => g.count > 0)).toBe(true);
    expect(doc.groups.find((g) => g.title === 'Epic')).toBeUndefined();
  });

  it('every source issue appears at least once across all grouping modes (nothing dropped — GROUP-06)', () => {
    const issues = [
      makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' }, releaseNote: 'valid bug fix note text' }),
      makeIssue({ key: 'P-2', issuetype: { name: 'Story', id: '2' }, releaseNote: 'valid story note text here' }),
      makeIssue({ key: 'P-3', issuetype: { name: 'Task', id: '3' }, releaseNote: '' }),
    ];
    const modes: GroupingMode[] = ['flat', 'type', 'component', 'epic'];
    for (const mode of modes) {
      const doc = buildDocumentDoc(mode, issues, {}, 'priority', 'desc', '', '');
      const allKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
      for (const issue of issues) {
        expect(allKeys).toContain(issue.key);
      }
    }
  });

  it('DocItem.text carries the marker when the note is problematic (D-20)', () => {
    const issues = [makeIssue({ key: 'P-1', releaseNote: '', summary: 'Пустая заметка' })];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '');
    expect(doc.groups[0].items[0].text).toBe('[ПУСТО] Пустая заметка');
  });

  it('DocItem.text uses edited note when present (D-19)', () => {
    const issues = [makeIssue({ key: 'P-1', releaseNote: 'original note text', summary: 'S' })];
    const doc = buildDocumentDoc('flat', issues, { 'P-1': 'edited note text here' }, 'priority', 'desc', '', '');
    expect(doc.groups[0].items[0].text).toBe('edited note text here');
  });

  it('DocGroup.title is the label WITHOUT the count; count = items.length (D-13)', () => {
    const issues = [
      makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' }, releaseNote: 'valid bug fix note text' }),
      makeIssue({ key: 'P-2', issuetype: { name: 'Bug', id: '1' }, releaseNote: 'another valid bug note' }),
    ];
    const doc = buildDocumentDoc('type', issues, {}, 'priority', 'desc', '', '');
    const bug = doc.groups.find((g) => g.title === 'Bug')!;
    expect(bug.count).toBe(2);
    expect(bug.items.length).toBe(2);
  });

  it('does NOT re-derive PRIORITY_WEIGHT (reuses sortIssues) — no PRIORITY_WEIGHT symbol in source', () => {
    // This is a structural assertion mirrored by the acceptance grep; here we just sanity-check
    // that the module imports without a local priority map by exercising desc sort.
    const issues = [
      makeIssue({ key: 'P-1', priority: { name: 'Highest', id: '0' }, releaseNote: 'valid note text here' }),
      makeIssue({ key: 'P-2', priority: { name: 'Low', id: '4' }, releaseNote: 'valid note text here' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '');
    expect(doc.groups[0].items[0].key).toBe('P-1'); // Highest first
  });
});

describe('buildDocumentDoc — skip exclusion (D-15/D-17, SKIP-01)', () => {
  it('a skip issue is absent from ALL groups; the valid issue is present (D-15)', () => {
    const issues = [
      makeIssue({ key: 'P-SKIP', releaseNote: SKIP_MARKER, summary: 'Пропущенная задача' }),
      makeIssue({ key: 'P-VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'S' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '');
    const allKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
    expect(allKeys).not.toContain('P-SKIP');
    expect(allKeys).toContain('P-VALID');
  });

  it('header.total excludes skip (exportable count, NOT source count) — D-15', () => {
    const issues = [
      makeIssue({ key: 'P-SKIP', releaseNote: SKIP_MARKER, summary: 'Пропущенная задача' }),
      makeIssue({ key: 'P-VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'S' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '');
    expect(doc.header.total).toBe(1); // exportable count — the skip issue does not inflate it
  });

  it('edit removing the marker reactivates the issue into the document (D-17/D-18)', () => {
    const skipIssue = makeIssue({ key: 'P-SKIP', releaseNote: SKIP_MARKER, summary: 'S' });
    const editedNotes = { 'P-SKIP': 'Исправлен краш при загрузке данных' };
    const doc = buildDocumentDoc('flat', [skipIssue], editedNotes, 'priority', 'desc', '', '');
    const allKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
    expect(allKeys).toContain('P-SKIP'); // the edited text is valid → not skip → stays in the doc
    expect(doc.header.total).toBe(1);
  });
});
