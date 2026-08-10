import type { Issue } from '../../../shared/types/issue';

export type ValidationCategory = 'empty' | 'short' | 'placeholder' | 'skip' | 'valid';

export type ValidationFilterMode = 'all' | 'problematic' | 'valid' | 'skipped';

/** Placeholder patterns (D-31) — case-insensitive, trimmed match. */
export const PLACEHOLDER_PATTERNS = [
  'n/a',
  'na',
  'todo',
  'tbd',
  'без комментария',
  'нет описания',
  'нет',
  '---',
  '...',
  'заглушка',
  'placeholder',
];

/** Short threshold (D-30) — fewer than this many chars is 'short'. */
export const SHORT_THRESHOLD = 15;

/**
 * D-05 — canonical skip marker, hardcoded (no aliases, no config). Exact match after
 * trim().toLowerCase() (D-06): the field must be EXACTLY this marker (case-insensitive,
 * surrounding whitespace tolerated) to be classified 'skip'.
 */
export const SKIP_MARKER = '<no-release-notes>';

/** Sort priority (D-35) — lower = more problematic, sorts first. skip sits between placeholder
 * and valid (D-04): intentional exclusion, not a problem, but shown above valid for visibility. */
export const categoryPriority: Record<ValidationCategory, number> = {
  empty: 0,
  short: 1,
  placeholder: 2,
  skip: 3,
  valid: 4,
};

/**
 * Validate a single release note value (D-30, D-31).
 * Returns the category for coloring + icon.
 */
export function validateReleaseNote(note: string): ValidationCategory {
  const trimmed = note.trim();
  // D-02 — skip FIRST. `<no-release-notes>` is technically non-empty but semantically skip, so it
  // must be classified before the empty/placeholder/short checks. Exact match (D-06): an inline
  // marker surrounded by real text stays valid — only a field that IS the marker becomes skip.
  if (trimmed.toLowerCase() === SKIP_MARKER) return 'skip';
  if (trimmed === '') return 'empty';

  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_PATTERNS.includes(lower)) return 'placeholder';

  // Only digits, dots, dashes → placeholder
  if (/^[0-9.\-]+$/.test(trimmed)) return 'placeholder';

  if (trimmed.length < SHORT_THRESHOLD) return 'short';

  return 'valid';
}

/** Validate all issues, return Map keyed by issue.key (D-30). */
export function validateIssues(issues: Issue[]): Map<string, ValidationCategory> {
  const map = new Map<string, ValidationCategory>();
  for (const issue of issues) {
    map.set(issue.key, validateReleaseNote(issue.releaseNote));
  }
  return map;
}

export interface CategoryCounts {
  total: number;
  empty: number;
  short: number;
  placeholder: number;
  skip: number;
  valid: number;
}

/** Count issues by category (D-34). */
export function countByCategory(categories: Map<string, ValidationCategory>): CategoryCounts {
  const counts: CategoryCounts = { total: 0, empty: 0, short: 0, placeholder: 0, skip: 0, valid: 0 };
  for (const cat of categories.values()) {
    counts.total++;
    counts[cat]++;
  }
  return counts;
}
