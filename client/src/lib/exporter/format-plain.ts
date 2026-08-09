import type { DocumentDoc } from './types.js';
import { pluralizeTask } from './format-md.js';

/**
 * Plain-text renderer (CONTEXT.md D-23, EXP-02).
 *
 * Pure: takes a DocumentDoc, returns a plain string with markdown markers stripped. Same structure
 * as buildMarkdown (header + groups + items) but WITHOUT '# ', '**…**', or '- ' prefixes. Items are
 * indented with two spaces instead of a bullet; groups and the header are separated by blank lines.
 *
 * Reuses pluralizeTask so the «Всего: N …» line stays consistent across formats (D-32 — every
 * renderer consumes the same DocumentDoc; the plural word is format-agnostic). Note text is NOT
 * escaped (D-33) and nothing inside item text is stripped — only the structural markers that
 * buildMarkdown ADDS are simply omitted here.
 */

/**
 * Build the plain-text header (D-17 minus markdown):
 *   - 'Release Notes' (no '# ').
 *   - 'Версия: {v}  Дата: {d}' combined on one line with TWO spaces when both present; single line
 *     when only one is present; no line when both blank.
 *   - 'Всего: {n} {pluralizeTask(n)}'.
 * No '---' separator — plain text has no horizontal rule; a blank line separates header from body.
 */
function formatPlainHeader(version: string, date: string, total: number): string {
  const lines: string[] = ['Release Notes'];
  const hasVersion = version.trim() !== '';
  const hasDate = date.trim() !== '';
  if (hasVersion && hasDate) {
    lines.push(`Версия: ${version}  Дата: ${date}`); // exactly two spaces
  } else if (hasVersion) {
    lines.push(`Версия: ${version}`);
  } else if (hasDate) {
    lines.push(`Дата: ${date}`);
  }
  lines.push(`Всего: ${total} ${pluralizeTask(total)}`);
  return lines.join('\n');
}

/**
 * buildPlain — render the whole DocumentDoc as plain text.
 *
 * Header, then each group as '{title} ({count})' followed by '  {key}: {text}' items (two-space
 * indent, no bullet). Blocks joined by blank lines. Note text is NOT escaped (D-33).
 */
export function buildPlain(doc: DocumentDoc): string {
  const blocks: string[] = [formatPlainHeader(doc.header.version, doc.header.date, doc.header.total)];
  for (const group of doc.groups) {
    const groupLines = [`${group.title} (${group.count})`];
    for (const item of group.items) {
      groupLines.push(`  ${item.key}: ${item.text}`);
    }
    blocks.push(groupLines.join('\n'));
  }
  return blocks.join('\n\n');
}
