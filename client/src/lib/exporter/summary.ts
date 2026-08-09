/**
 * buildSummary (CONTEXT.md D-41) — the plain summary-line string «Групп: N • Задач: M • С правками: K».
 *
 * Returns a plain string (no JSX) so it is unit-testable and usable in a `title` attribute. The
 * UI component in Plan 04 wraps the numbers in <strong> directly for the visible row — this helper
 * carries the canonical wording + bullet layout so the title attribute and the visible row stay
 * in lockstep.
 *
 * Bullets are the literal '•' character per the Copywriting Contract.
 */
export function buildSummary(groupCount: number, issueTotal: number, editedCount: number): string {
  return `Групп: ${groupCount} • Задач: ${issueTotal} • С правками: ${editedCount}`;
}
