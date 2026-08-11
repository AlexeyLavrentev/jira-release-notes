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
import { SKIP_MARKER, createValidation, DEFAULT_THRESHOLD } from '../validation.js';
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
      makeIssue({ key: 'P-LOW', priority: { name: 'Low', id: '4' }, releaseNote: 'valid low note text' }),
      makeIssue({ key: 'P-HIGH', priority: { name: 'High', id: '1' }, releaseNote: 'valid high note text' }),
      makeIssue({ key: 'P-MED', priority: { name: 'Medium', id: '2' }, releaseNote: 'valid med note text' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    const flat = doc.groups[0];
    const keys = flat.items.map((i) => i.key);
    expect(keys).toEqual(['P-HIGH', 'P-MED', 'P-LOW']);
  });
});

describe('resolveNoteText (Phase 10 — pure edit resolution, no markers)', () => {
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

  it('empty resolved note returns the raw empty releaseNote (Phase 10 — no [ПУСТО] marker)', () => {
    // Phase 10: invalid notes are routed to doc.missingNotes by buildDocumentDoc; resolveNoteText
    // no longer prefixes markers. An empty note yields the raw empty string.
    const issue = makeIssue({ key: 'P-1', releaseNote: '', summary: 'Краш при загрузке' });
    expect(resolveNoteText(issue, undefined)).toBe('');
    expect(resolveNoteText(issue, '   ')).toBe('   ');
  });

  it('placeholder resolved note returns the raw placeholder text (Phase 10 — no [ЗАГЛУШКА] marker)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'TODO', summary: 'Новая фича' });
    expect(resolveNoteText(issue, undefined)).toBe('TODO');
  });

  it('short resolved note returns the raw short text (Phase 10 — no [КОРОТКО] marker)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'ок', summary: 'Мелкий фикс' });
    expect(resolveNoteText(issue, undefined)).toBe('ок');
  });

  it('valid resolved note passes through unchanged (no marker)', () => {
    const issue = makeIssue({ key: 'P-1', releaseNote: 'Исправлен краш при загрузке данных', summary: 'S' });
    expect(resolveNoteText(issue, undefined)).toBe('Исправлен краш при загрузке данных');
  });

  it('skip resolved note returns the raw marker string (Phase 10 — no defensive emptying)', () => {
    // Phase 10: resolveNoteText is pure edit-resolution. Skip issues are filtered out of the
    // document before this runs (buildDocumentDoc), so a skip issue never reaches it in practice;
    // but if one did, it now returns the raw marker rather than a defensive ''.
    const issue = makeIssue({ key: 'P-1', releaseNote: SKIP_MARKER, summary: 'S' });
    expect(resolveNoteText(issue, undefined)).toBe(SKIP_MARKER);
  });
});

describe('buildDocumentDoc', () => {
  it('header.total = valid issue count, NOT summed group items (GROUP-06 — multi-component does not inflate; D-15 — skip excluded; Phase 10 D-03 — valid only)', () => {
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
    const doc = buildDocumentDoc('component', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    expect(doc.header.total).toBe(1); // valid count, not 2 (one valid issue, no skip, no invalid)
    // but the issue appears in two groups
    expect(doc.groups.length).toBe(2);
  });

  it('omits groups with zero items (D-14 — no "## Epic (0)")', () => {
    const issues = [makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' }, releaseNote: 'valid bug fix note text' })];
    const doc = buildDocumentDoc('type', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    expect(doc.groups.every((g) => g.count > 0)).toBe(true);
    expect(doc.groups.find((g) => g.title === 'Epic')).toBeUndefined();
  });

  it('every VALID source issue appears in groups; invalid issues appear in missingNotes (Phase 10 D-05 — nothing dropped)', () => {
    const issues = [
      makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' }, releaseNote: 'valid bug fix note text' }),
      makeIssue({ key: 'P-2', issuetype: { name: 'Story', id: '2' }, releaseNote: 'valid story note text here' }),
      makeIssue({ key: 'P-3', issuetype: { name: 'Task', id: '3' }, releaseNote: '' }),
    ];
    const modes: GroupingMode[] = ['flat', 'type', 'component', 'epic'];
    for (const mode of modes) {
      const doc = buildDocumentDoc(mode, issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
      const groupKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
      // P-1 and P-2 (valid) appear in groups; P-3 (empty) appears in missingNotes, NOT in groups.
      expect(groupKeys).toContain('P-1');
      expect(groupKeys).toContain('P-2');
      expect(groupKeys).not.toContain('P-3');
      const missingKeys = doc.missingNotes.map((m) => m.key);
      expect(missingKeys).toContain('P-3');
    }
  });

  it('Phase 10 — an empty note lands in missingNotes (category "empty"), NOT in a group with a marker', () => {
    const issues = [makeIssue({ key: 'P-1', releaseNote: '', summary: 'Пустая заметка' })];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    expect(doc.groups).toEqual([]); // no valid issues → no groups
    expect(doc.missingNotes).toHaveLength(1);
    expect(doc.missingNotes[0].key).toBe('P-1');
    expect(doc.missingNotes[0].category).toBe('empty');
    expect(doc.missingNotes[0].summary).toBe('Пустая заметка');
  });

  it('DocItem.text uses edited note when present (D-19)', () => {
    const issues = [makeIssue({ key: 'P-1', releaseNote: 'original note text', summary: 'S' })];
    const doc = buildDocumentDoc('flat', issues, { 'P-1': 'edited note text here' }, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    expect(doc.groups[0].items[0].text).toBe('edited note text here');
  });

  it('DocGroup.title is the label WITHOUT the count; count = items.length (D-13)', () => {
    const issues = [
      makeIssue({ key: 'P-1', issuetype: { name: 'Bug', id: '1' }, releaseNote: 'valid bug fix note text' }),
      makeIssue({ key: 'P-2', issuetype: { name: 'Bug', id: '1' }, releaseNote: 'another valid bug note' }),
    ];
    const doc = buildDocumentDoc('type', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
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
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    expect(doc.groups[0].items[0].key).toBe('P-1'); // Highest first
  });
});

describe('buildDocumentDoc — skip exclusion (D-15/D-17, SKIP-01)', () => {
  it('a skip issue is absent from ALL groups AND missingNotes; the valid issue is present (D-15)', () => {
    const issues = [
      makeIssue({ key: 'P-SKIP', releaseNote: SKIP_MARKER, summary: 'Пропущенная задача' }),
      makeIssue({ key: 'P-VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'S' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    const allKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
    expect(allKeys).not.toContain('P-SKIP');
    expect(allKeys).toContain('P-VALID');
    expect(doc.missingNotes.map((m) => m.key)).not.toContain('P-SKIP');
  });

  it('header.total excludes skip (valid count, NOT source count) — D-15', () => {
    const issues = [
      makeIssue({ key: 'P-SKIP', releaseNote: SKIP_MARKER, summary: 'Пропущенная задача' }),
      makeIssue({ key: 'P-VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'S' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    expect(doc.header.total).toBe(1); // valid count — the skip issue does not inflate it
  });

  it('edit removing the marker reactivates the issue into the document (D-17/D-18)', () => {
    const skipIssue = makeIssue({ key: 'P-SKIP', releaseNote: SKIP_MARKER, summary: 'S' });
    const editedNotes = { 'P-SKIP': 'Исправлен краш при загрузке данных' };
    const doc = buildDocumentDoc('flat', [skipIssue], editedNotes, 'priority', 'desc', '', '', createValidation(DEFAULT_THRESHOLD).validateReleaseNote);
    const allKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
    expect(allKeys).toContain('P-SKIP'); // the edited text is valid → not skip → stays in the doc
    expect(doc.header.total).toBe(1);
  });
});

describe('buildDocumentDoc — missingNotes partition (D-01/D-05/D-11, EXPORT-02)', () => {
  // Shared factory bound to threshold=15 — same as the production default.
  const validateFn = createValidation(15).validateReleaseNote;

  it('(a) empty + short + placeholder + valid → 3 missing (categoryPriority order), 1 valid in a group, header.total=1', () => {
    const issues = [
      makeIssue({ key: 'EMPTY', releaseNote: '', summary: 'Пустая заметка' }),
      makeIssue({ key: 'SHORT', releaseNote: 'ок', summary: 'Короткая заметка' }),
      makeIssue({ key: 'PLACE', releaseNote: 'TODO', summary: 'Заглушка' }),
      makeIssue({ key: 'VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'Реальный фикс' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', validateFn);
    // D-11 — missingNotes ordered by categoryPriority: empty(0) → short(1) → placeholder(2).
    expect(doc.missingNotes).toHaveLength(3);
    expect(doc.missingNotes.map((m) => m.category)).toEqual(['empty', 'short', 'placeholder']);
    expect(doc.missingNotes.map((m) => m.key)).toEqual(['EMPTY', 'SHORT', 'PLACE']);
    // Each missing item carries key + summary + category (D-09).
    expect(doc.missingNotes[0]).toEqual({ key: 'EMPTY', summary: 'Пустая заметка', category: 'empty' });
    // Only the valid issue is in a group.
    expect(doc.groups[0].items.map((i) => i.key)).toEqual(['VALID']);
    expect(doc.groups[0].items).toHaveLength(1);
    // D-03 — header.total = valid count only.
    expect(doc.header.total).toBe(1);
  });

  it('(b) edits priority (D-06): editing an empty note to valid text moves it from missingNotes into a group', () => {
    const issues = [
      makeIssue({ key: 'EMPTY', releaseNote: '', summary: 'Пустая заметка' }),
      makeIssue({ key: 'VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'Реальный фикс' }),
    ];
    // Fill the empty note with valid text via edits.
    const editedNotes = { EMPTY: 'Исправлен краш при загрузке данных' };
    const doc = buildDocumentDoc('flat', issues, editedNotes, 'priority', 'desc', '', '', validateFn);
    // EMPTY is now valid → in a group, absent from missingNotes.
    const groupKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
    expect(groupKeys).toContain('EMPTY');
    expect(doc.missingNotes.map((m) => m.key)).not.toContain('EMPTY');
    expect(doc.header.total).toBe(2); // both now valid
  });

  it('(b-cont) edits priority: editing a valid note to short moves it from a group into missingNotes', () => {
    const issues = [
      makeIssue({ key: 'VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'Реальный фикс' }),
    ];
    // Shorten the valid note below threshold via edits.
    const editedNotes = { VALID: 'ок' };
    const doc = buildDocumentDoc('flat', issues, editedNotes, 'priority', 'desc', '', '', validateFn);
    // VALID is now short → in missingNotes, absent from groups.
    expect(doc.groups).toEqual([]);
    expect(doc.missingNotes).toHaveLength(1);
    expect(doc.missingNotes[0].key).toBe('VALID');
    expect(doc.missingNotes[0].category).toBe('short');
    expect(doc.header.total).toBe(0);
  });

  it('(c) skip regression: a skip issue is excluded from groups AND missingNotes AND header.total', () => {
    const issues = [
      makeIssue({ key: 'SKIP', releaseNote: SKIP_MARKER, summary: 'Пропущено' }),
      makeIssue({ key: 'EMPTY', releaseNote: '', summary: 'Пустая' }),
      makeIssue({ key: 'VALID', releaseNote: 'Исправлен краш при загрузке данных', summary: 'Фикс' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', validateFn);
    const groupKeys = doc.groups.flatMap((g) => g.items.map((i) => i.key));
    const missingKeys = doc.missingNotes.map((m) => m.key);
    expect(groupKeys).not.toContain('SKIP');
    expect(missingKeys).not.toContain('SKIP'); // D-15 — skip is NOT a missing category
    expect(doc.header.total).toBe(1); // VALID only
    expect(missingKeys).toContain('EMPTY'); // empty still routed to missing
  });

  it('(d) D-16 edge: all issues invalid → header.total=0, groups=[], missingNotes.length=N', () => {
    const issues = [
      makeIssue({ key: 'EMPTY', releaseNote: '', summary: 'Пустая' }),
      makeIssue({ key: 'SHORT', releaseNote: 'ок', summary: 'Короткая' }),
    ];
    const doc = buildDocumentDoc('flat', issues, {}, 'priority', 'desc', '', '', validateFn);
    expect(doc.header.total).toBe(0);
    expect(doc.groups).toEqual([]); // empty groups omitted (D-14)
    expect(doc.missingNotes).toHaveLength(2);
    expect(doc.missingNotes.map((m) => m.category)).toEqual(['empty', 'short']); // categoryPriority order
  });

  it('(e) D-17 edge: empty issues array → header.total=0, groups=[], missingNotes=[]', () => {
    const doc = buildDocumentDoc('flat', [], {}, 'priority', 'desc', '', '', validateFn);
    expect(doc.header.total).toBe(0);
    expect(doc.groups).toEqual([]);
    expect(doc.missingNotes).toEqual([]);
  });
});
