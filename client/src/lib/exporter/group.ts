import type { Issue } from '../../../../shared/types/issue';
import { sortIssues, type SortDirection } from '../sort.js';
import { validateReleaseNote } from '../validation.js';
import type { DocumentDoc, DocGroup, DocItem, ExportSortKey, GroupingMode } from './types.js';

/**
 * Grouping core (CONTEXT.md D-09, D-14, D-19, D-20, D-31, D-32).
 *
 * groupBy produces an insertion-ordered Map<groupKey, Issue[]> honoring the D-09 group order.
 * buildDocumentDoc orchestrates groupBy → per-group sortIssues (reused, not re-derived) → DocItem
 * mapping (edits priority + markers) and omits empty groups (D-14). header.total is the SOURCE
 * issue count so multi-component issues do not inflate the headline number (GROUP-06).
 */

/** D-09 — predefined type-template order; issues whose issuetype is not here get alphabetical groups after the four. */
export const TYPE_GROUP_ORDER = ['Epic', 'Story', 'Task', 'Bug'] as const;

/** D-09 — final-bucket labels for issues without a component / without an epic. */
export const NO_COMPONENT_LABEL = 'Без компонента';
export const NO_EPIC_LABEL = 'Без эпика';

/** Internal flat-group label (single-group mode). */
const FLAT_LABEL = 'Без групп';

/**
 * Resolve the FINAL note text for an issue (D-19 edits priority + D-20 markers).
 *
 * `editedText` (if present) wins over `issue.releaseNote`. The resolved text is then run through
 * validateReleaseNote: empty/placeholder/short notes are prefixed with a Russian marker + the
 * issue summary; valid notes pass through unchanged. Stays pure — caller owns edit lookup.
 */
export function resolveNoteText(issue: Issue, editedText: string | undefined): string {
  const resolved = editedText ?? issue.releaseNote;
  const category = validateReleaseNote(resolved);
  switch (category) {
    case 'empty':
      return `[ПУСТО] ${issue.summary}`;
    case 'placeholder':
      return `[ЗАГЛУШКА] ${issue.summary}`;
    case 'short':
      return `[КОРОТКО] ${issue.summary}`;
    default:
      return resolved;
  }
}

/**
 * groupBy (D-09) — insertion-ordered Map of groupKey → issues in that group.
 *
 * - 'type': TYPE_GROUP_ORDER first, then any other issuetype alphabetical. No zero groups (only
 *   issuetypes that appear get a key).
 * - 'component': alphabetical component names, then NO_COMPONENT_LABEL last. An issue with N
 *   components contributes to N groups; an issue with zero components goes only into NO_COMPONENT_LABEL.
 * - 'epic': alphabetical epic summaries, then NO_EPIC_LABEL last. issue.epic?.summary ?? NO_EPIC_LABEL.
 * - 'flat': a single group keyed FLAT_LABEL.
 */
export function groupBy(mode: GroupingMode, issues: Issue[]): Map<string, Issue[]> {
  if (mode === 'flat') {
    const map = new Map<string, Issue[]>();
    map.set(FLAT_LABEL, [...issues]);
    return map;
  }

  if (mode === 'type') {
    // First pass: collect into a Map keyed by issuetype.name (insertion = encounter order).
    const collected = new Map<string, Issue[]>();
    for (const issue of issues) {
      const name = issue.issuetype.name;
      const bucket = collected.get(name);
      if (bucket) bucket.push(issue);
      else collected.set(name, [issue]);
    }
    // Order: TYPE_GROUP_ORDER (only those present), then the rest alphabetical.
    const orderedKeys: string[] = [];
    for (const t of TYPE_GROUP_ORDER) {
      if (collected.has(t)) orderedKeys.push(t);
    }
    const others = [...collected.keys()].filter((k) => !TYPE_GROUP_ORDER.includes(k as never)).sort((a, b) => a.localeCompare(b));
    orderedKeys.push(...others);
    const out = new Map<string, Issue[]>();
    for (const k of orderedKeys) out.set(k, collected.get(k)!);
    return out;
  }

  if (mode === 'component') {
    const collected = new Map<string, Issue[]>();
    for (const issue of issues) {
      if (issue.components.length === 0) {
        const bucket = collected.get(NO_COMPONENT_LABEL);
        if (bucket) bucket.push(issue);
        else collected.set(NO_COMPONENT_LABEL, [issue]);
      } else {
        for (const c of issue.components) {
          const bucket = collected.get(c.name);
          if (bucket) bucket.push(issue);
          else collected.set(c.name, [issue]);
        }
      }
    }
    // Alphabetical component names, then NO_COMPONENT_LABEL last.
    const named = [...collected.keys()].filter((k) => k !== NO_COMPONENT_LABEL).sort((a, b) => a.localeCompare(b));
    const orderedKeys = collected.has(NO_COMPONENT_LABEL) ? [...named, NO_COMPONENT_LABEL] : named;
    const out = new Map<string, Issue[]>();
    for (const k of orderedKeys) out.set(k, collected.get(k)!);
    return out;
  }

  // mode === 'epic'
  const collected = new Map<string, Issue[]>();
  for (const issue of issues) {
    const label = issue.epic?.summary ?? NO_EPIC_LABEL;
    const bucket = collected.get(label);
    if (bucket) bucket.push(issue);
    else collected.set(label, [issue]);
  }
  const named = [...collected.keys()].filter((k) => k !== NO_EPIC_LABEL).sort((a, b) => a.localeCompare(b));
  const orderedKeys = collected.has(NO_EPIC_LABEL) ? [...named, NO_EPIC_LABEL] : named;
  const out = new Map<string, Issue[]>();
  for (const k of orderedKeys) out.set(k, collected.get(k)!);
  return out;
}

/**
 * sortGroups (D-09) — canonical accessor for group ordering.
 *
 * The Map returned by groupBy is already insertion-ordered correctly, so this helper is the
 * single place that materializes that order from raw keys (for callers that hold an unsorted key
 * list). The renderer should never re-sort on its own.
 */
export function sortGroups(mode: GroupingMode, groupKeys: string[]): string[] {
  if (mode === 'flat') {
    return [...groupKeys];
  }
  if (mode === 'type') {
    const present = new Set(groupKeys);
    const ordered: string[] = [];
    for (const t of TYPE_GROUP_ORDER) {
      if (present.has(t)) ordered.push(t);
    }
    const others = groupKeys.filter((k) => !TYPE_GROUP_ORDER.includes(k as never)).sort((a, b) => a.localeCompare(b));
    ordered.push(...others);
    return ordered;
  }
  // 'component' | 'epic' share the "alphabetical, bucket last" rule.
  const bucket = mode === 'component' ? NO_COMPONENT_LABEL : NO_EPIC_LABEL;
  const named = groupKeys.filter((k) => k !== bucket).sort((a, b) => a.localeCompare(b));
  return groupKeys.includes(bucket) ? [...named, bucket] : named;
}

/**
 * buildDocumentDoc (D-31/D-32) — orchestrate grouping + within-group sort + DocItem mapping.
 *
 * - Groups with zero items are omitted entirely (D-14).
 * - header.total = issues.length (the SOURCE count), NOT the sum of group items — so a single
 *   issue appearing in two component groups does not inflate the headline total (GROUP-06).
 * - Within each group, items are sorted via the existing sortIssues (reused — never re-derive
 *   priority weights here). ExportSortKey is a subset of SortKey, so the cast is sound.
 */
export function buildDocumentDoc(
  mode: GroupingMode,
  issues: Issue[],
  editedNotes: Record<string, string>,
  sortKey: ExportSortKey,
  dir: SortDirection,
  version: string,
  date: string,
): DocumentDoc {
  const grouped = groupBy(mode, issues);
  const orderedKeys = [...grouped.keys()]; // already D-09 ordered

  // D-08/D-11 — the SEMANTIC direction: `desc` means "important/newest/Z first".
  // For 'resolutiondate' and 'key' this lines up with sortIssues's `desc` directly, but for
  // 'priority' sortIssues maps Highest→weight 0, so its `asc` already yields Highest-first. To
  // keep the user-facing "priority DESC = Highest first" (D-11: важное сверху) while REUSING
  // sortIssues unchanged (per plan + no churn to Phase 3's table sort), flip the direction only
  // for the priority key at this boundary. The doc's stored `dir` stays the semantic value.
  const effectiveDir: SortDirection = sortKey === 'priority' ? (dir === 'desc' ? 'asc' : 'desc') : dir;

  const groups: DocGroup[] = [];
  for (const key of orderedKeys) {
    const groupIssues = grouped.get(key)!;
    if (groupIssues.length === 0) continue; // D-14 — omit empty groups
    const sorted = sortIssues(groupIssues, sortKey, effectiveDir);
    const items: DocItem[] = sorted.map((issue) => ({
      key: issue.key,
      text: resolveNoteText(issue, editedNotes[issue.key]),
    }));
    groups.push({ title: key, count: items.length, items });
  }

  return {
    header: { version, date, total: issues.length },
    groups,
  };
}
