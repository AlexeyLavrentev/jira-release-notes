import type { Issue } from '../../../../shared/types/issue';
import { sortIssues, type SortDirection } from '../sort.js';
import { categoryPriority, type ValidationCategory } from '../validation.js';
import type {
  DocumentDoc,
  DocGroup,
  DocItem,
  ExportSortKey,
  GroupingMode,
  MissingCategory,
  MissingItem,
} from './types.js';

/**
 * Grouping core (CONTEXT.md D-09, D-14, D-15, D-17, D-19, D-20, D-31, D-32; Phase 10 D-01..D-06).
 *
 * groupBy produces an insertion-ordered Map<groupKey, Issue[]> honoring the D-09 group order.
 * buildDocumentDoc orchestrates skip exclusion (D-15) → valid/invalid partition (Phase 10 D-05)
 * → groupBy (valid only) → per-group sortIssues (reused, not re-derived) → DocItem mapping
 * (edits priority, no markers — D-10) and omits empty groups (D-14). header.total is the VALID
 * issue count (Phase 10 D-03) so multi-component issues do not inflate the headline number
 * (GROUP-06), intentionally-excluded skip issues never appear, and invalid (empty/short/
 * placeholder) issues are counted separately in the «Нет release note» section (D-01).
 *
 * Phase 10: this module is PURE (non-React) and unit-tested directly. It cannot call
 * useValidation(). The validation function reaches buildDocumentDoc via the trailing `validateFn`
 * parameter, threaded in by ExportPage (PATTERNS Open Q1, resolved Option A).
 */

/** D-09 — predefined type-template order; issues whose issuetype is not here get alphabetical groups after the four. */
export const TYPE_GROUP_ORDER = ['Epic', 'Story', 'Task', 'Bug'] as const;

/** D-09 — final-bucket labels for issues without a component / without an epic. */
export const NO_COMPONENT_LABEL = 'Без компонента';
export const NO_EPIC_LABEL = 'Без эпика';

/** Internal flat-group label (single-group mode). */
const FLAT_LABEL = 'Без групп';

/**
 * Resolve the FINAL note text for an issue (Phase 4 D-19 edits priority).
 *
 * Phase 10 — invalid notes (empty/placeholder/short) no longer get in-body markers; they are
 * routed to DocumentDoc.missingNotes by buildDocumentDoc. resolveNoteText is now PURE
 * edit-resolution: `editedText` (if present) wins over `issue.releaseNote`, full stop. Skip notes
 * are filtered out before this runs (D-15); valid notes pass through unchanged. The old uppercase
 * Russian marker switch (Phase 5 D-20) is removed entirely — invalid notes carry a lowercase
 * category label in the missing section instead (format-md.ts MISSING_LABEL).
 */
export function resolveNoteText(issue: Issue, editedText: string | undefined): string {
  return editedText ?? issue.releaseNote;
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
 * buildDocumentDoc (D-15/D-31/D-32; Phase 10 D-01..D-06) — orchestrate skip exclusion +
 * valid/invalid partition + grouping + within-group sort + DocItem mapping.
 *
 * - D-15/D-17 — skip issues are excluded ENTIRELY (no group, no document, no «Нет release note»)
 *   BEFORE the partition. The filter uses the edits-priority expression so an engineer who removed
 *   the marker in EditPage reactivates the issue (validateFn on the edited text → non-skip).
 * - Phase 10 D-05/D-06 — after skip exclusion, the remaining issues are partitioned by validateFn
 *   into VALID (→ groups, rendered normally) and INVALID (empty/short/placeholder → missingNotes,
 *   the «Нет release note» trailing section). Edits priority applies: an edit that fills an empty
 *   note moves it into a group; an edit that shortens a valid note below threshold moves it out.
 * - Groups with zero items are omitted entirely (D-14).
 * - header.total = validIssues.length (Phase 10 D-03 — the VALID count only), NOT the sum of group
 *   items and NOT the raw source count. Multi-component issues do not inflate the headline
 *   (GROUP-06); skip and invalid issues are excluded from it; invalid issues carry their own
 *   counter in the missing-section heading (D-04).
 * - Within each group, items are sorted via the existing sortIssues (reused — never re-derive
 *   priority weights here). ExportSortKey is a subset of SortKey, so the cast is sound.
 *
 * @param validateFn Phase 10 D-08 — the `validateReleaseNote` function from a `createValidation`
 *   factory, threaded in by ExportPage via useValidation(). Pure module cannot reach React context.
 */
export function buildDocumentDoc(
  mode: GroupingMode,
  issues: Issue[],
  editedNotes: Record<string, string>,
  sortKey: ExportSortKey,
  dir: SortDirection,
  version: string,
  date: string,
  validateFn: (note: string) => ValidationCategory,
): DocumentDoc {
  // D-15/D-17 — exclude skip issues entirely before partitioning. Edit priority: if the engineer
  // removed the marker in EditPage, validateFn on the edited text returns non-skip and the issue
  // stays in the document. This expression matches resolveNoteText's edit resolution.
  const notSkipped = issues.filter(
    (issue) => validateFn(editedNotes[issue.key] ?? issue.releaseNote) !== 'skip',
  );

  // Phase 10 D-05/D-06 — partition the non-skip issues into valid (→ groups) vs invalid
  // (empty/short/placeholder → missingNotes). The same edits-priority expression as the skip
  // filter, so an edit that fills an empty note (or shortens a valid one) is reflected consistently.
  const missingItems: MissingItem[] = [];
  const validIssues: Issue[] = [];
  for (const issue of notSkipped) {
    const resolved = editedNotes[issue.key] ?? issue.releaseNote;
    const cat = validateFn(resolved);
    if (cat === 'valid') {
      validIssues.push(issue);
    } else {
      // `cat` is 'empty' | 'short' | 'placeholder' here — 'skip' is impossible because the
      // notSkipped filter above already excluded skip issues, and 'valid' is handled above. The
      // cast encodes that invariant; MissingCategory is exactly the residual union.
      missingItems.push({
        key: issue.key,
        summary: issue.summary,
        category: cat as MissingCategory,
      });
    }
  }

  // D-11 — sort missing items by categoryPriority (empty → short → placeholder). Node 22
  // Array.sort is stable, so items in the same category preserve source encounter order.
  missingItems.sort((a, b) => categoryPriority[a.category] - categoryPriority[b.category]);

  const grouped = groupBy(mode, validIssues);
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
    header: { version, date, total: validIssues.length },
    groups,
    missingNotes: missingItems,
  };
}
