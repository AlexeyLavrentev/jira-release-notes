import type { Issue } from '../../../shared/types/issue';

export type ValidationCategory = 'empty' | 'short' | 'placeholder' | 'valid';

export type ValidationFilterMode = 'all' | 'problematic' | 'valid';

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

/** Sort priority (D-35) — lower = more problematic, sorts first. */
export const categoryPriority: Record<ValidationCategory, number> = {
  empty: 0,
  short: 1,
  placeholder: 2,
  valid: 3,
};

/**
 * Validate a single release note value (D-30, D-31).
 * Returns the category for coloring + icon.
 */
export function validateReleaseNote(note: string): ValidationCategory {
  const trimmed = note.trim();
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
  valid: number;
}

/** Count issues by category (D-34). */
export function countByCategory(categories: Map<string, ValidationCategory>): CategoryCounts {
  const counts: CategoryCounts = { total: 0, empty: 0, short: 0, placeholder: 0, valid: 0 };
  for (const cat of categories.values()) {
    counts.total++;
    counts[cat]++;
  }
  return counts;
}
