/**
 * DocumentDoc — the neutral document model (CONTEXT.md D-32).
 *
 * The exporter splits logic (grouping + sort) from format (rendering). group.ts produces a
 * DocumentDoc; format-md.ts / format-plain.ts / format-html.ts each ONLY render a DocumentDoc.
 * Adding a format (e.g. CSV in v2, EXP-06) touches no grouping code.
 */

/** D-07 — the four grouping templates. 'flat' is the default (D-11). */
export type GroupingMode = 'type' | 'component' | 'epic' | 'flat';

/**
 * D-08 — within-group sort keys for the exporter. Narrower than lib/sort.ts SortKey (which also
 * includes 'summary'); we deliberately do NOT widen the shared type, so this local union stays
 * minimal and the three are the only valid in-group sorts.
 */
export type ExportSortKey = 'priority' | 'resolutiondate' | 'key';

/** One rendered line of the document — `text` is FINAL (edit applied, marker prefixed if problematic). */
export interface DocItem {
  key: string;
  text: string;
}

/**
 * One group. `title` is the display label WITHOUT the count (e.g. 'Bug', 'Без компонента');
 * `count` is items.length (rendered as `(count)` next to the H2).
 */
export interface DocGroup {
  title: string;
  count: number;
  items: DocItem[];
}

/** Document header block. version/date are '' when blank (D-17). total = SOURCE issue count (GROUP-06). */
export interface DocHeader {
  version: string;
  date: string;
  total: number;
}

/** The full neutral document — the single shape every renderer consumes. */
export interface DocumentDoc {
  header: DocHeader;
  groups: DocGroup[];
}
