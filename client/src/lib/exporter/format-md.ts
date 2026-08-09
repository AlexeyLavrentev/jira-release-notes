import type { DocumentDoc } from './types.js';

/**
 * Markdown renderer (CONTEXT.md D-10, D-13, D-17, D-23, D-33).
 *
 * Pure: takes a DocumentDoc, returns a markdown string. No escaping of note text (D-33 — release
 * notes are passed "as is", rehype-sanitize handles XSS downstream in DocumentPreview/HTML export).
 * The marker tokens [ПУСТО]/[ЗАГЛУШКА]/[КОРОТКО] are already baked into DocItem.text by group.ts.
 */

/**
 * Russian pluralization for «задача/задачи/задач» (UI-SPEC Copywriting Contract).
 *
 * - n%100 in 11..14 → 'задач' (eleven-thirteen exception)
 * - n%10 === 1 → 'задача'
 * - n%10 in 2..4 → 'задачи'
 * - otherwise → 'задач'
 */
export function pluralizeTask(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'задач';
  if (mod10 === 1) return 'задача';
  if (mod10 >= 2 && mod10 <= 4) return 'задачи';
  return 'задач';
}

/**
 * Build the header block (D-17):
 *   - H1 'Release Notes' always.
 *   - version+date combined on one line with exactly TWO spaces between when both present;
 *     only-version / only-date line when a single one is present; no line when both blank.
 *   - 'Всего: {n} {plural}' always.
 *   - '---' separator always after the header block.
 */
function formatHeader(version: string, date: string, total: number): string {
  const lines: string[] = ['# Release Notes'];
  const hasVersion = version.trim() !== '';
  const hasDate = date.trim() !== '';
  if (hasVersion && hasDate) {
    lines.push(`**Версия:** ${version}  **Дата:** ${date}`); // exactly two spaces
  } else if (hasVersion) {
    lines.push(`**Версия:** ${version}`);
  } else if (hasDate) {
    lines.push(`**Дата:** ${date}`);
  }
  lines.push(`Всего: ${total} ${pluralizeTask(total)}`);
  lines.push('---');
  return lines.join('\n\n');
}

/**
 * buildMarkdown — render the whole DocumentDoc to a markdown string.
 *
 * Header block, then each group as '## {title} ({count})' followed by '- {key}: {text}' items.
 * Sections joined by blank lines. Note text is NOT escaped (D-33).
 */
export function buildMarkdown(doc: DocumentDoc): string {
  const blocks: string[] = [formatHeader(doc.header.version, doc.header.date, doc.header.total)];
  for (const group of doc.groups) {
    const groupLines = [`## ${group.title} (${group.count})`];
    for (const item of group.items) {
      groupLines.push(`- ${item.key}: ${item.text}`);
    }
    blocks.push(groupLines.join('\n'));
  }
  return blocks.join('\n\n');
}
