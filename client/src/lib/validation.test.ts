import { describe, it, expect } from 'vitest';
import {
  createValidation,
  DEFAULT_THRESHOLD,
  categoryPriority,
  SKIP_MARKER,
  type ValidationCategory,
} from './validation.js';

/**
 * Direct unit coverage for validateReleaseNote — the core of SKIP-01/SKIP-02 (Phase 9) and the
 * Phase 10 threshold-parameterization contract (CONF-01). The Phase 9 skip-marker cases run through
 * `createValidation(DEFAULT_THRESHOLD)` so they exercise the same factory path as production
 * (ValidationProvider binds DEFAULT_THRESHOLD before /api/config resolves — D-14).
 *
 * Decision IDs reference .planning/phases/09-skip-markers/09-CONTEXT.md and
 * .planning/phases/10-clean-export-configurable-threshold/10-CONTEXT.md.
 */

describe('SKIP_MARKER constant (D-05)', () => {
  it('is exactly the canonical <no-release-notes> marker', () => {
    expect(SKIP_MARKER).toBe('<no-release-notes>');
  });
});

describe('validateReleaseNote — skip detection (D-05/D-06, SKIP-01)', () => {
  const v = createValidation(DEFAULT_THRESHOLD);
  it('classifies the exact marker as skip', () => {
    expect(v.validateReleaseNote('<no-release-notes>')).toBe('skip');
  });

  it('classifies the marker with surrounding whitespace as skip (trimmed, D-06)', () => {
    expect(v.validateReleaseNote('  <no-release-notes>  ')).toBe('skip');
  });

  it('classifies the upper-case marker as skip (case-insensitive, D-06)', () => {
    expect(v.validateReleaseNote('<NO-RELEASE-NOTES>')).toBe('skip');
  });

  it('does NOT classify the marker inline with real text as skip (no false positives, D-06)', () => {
    // The marker appears, but surrounded by real descriptive text — this is a valid note.
    expect(v.validateReleaseNote('Исправлен баг <no-release-notes>')).toBe('valid');
  });

  it('does NOT classify the marker with extra chars as skip (exact-match only, D-06)', () => {
    expect(v.validateReleaseNote('<no-release-notes>extra')).toBe('valid');
  });
});

describe('validateReleaseNote — skip-first priority (D-02)', () => {
  const v = createValidation(DEFAULT_THRESHOLD);
  it('still classifies genuinely empty strings as empty (skip check does not shadow empty)', () => {
    expect(v.validateReleaseNote('')).toBe('empty');
    expect(v.validateReleaseNote('   ')).toBe('empty');
  });

  it('still classifies placeholder/short correctly (skip did not reorder other checks)', () => {
    expect(v.validateReleaseNote('TODO')).toBe('placeholder');
    expect(v.validateReleaseNote('ок')).toBe('short');
  });
});

describe('createValidation(threshold) — threshold parameterization (CONF-01, D-08)', () => {
  it('boundary: exactly at threshold is valid (15 chars, threshold=15)', () => {
    const v = createValidation(15);
    expect(v.validateReleaseNote('x'.repeat(15))).toBe('valid');
  });

  it('boundary: one char below threshold is short (14 chars, threshold=15)', () => {
    const v = createValidation(15);
    expect(v.validateReleaseNote('x'.repeat(14))).toBe('short');
  });

  it('threshold=10 → "ок" (len 2) is short; threshold=1 → "ок" (len 2) is valid', () => {
    expect(createValidation(10).validateReleaseNote('ок')).toBe('short');
    expect(createValidation(1).validateReleaseNote('ок')).toBe('valid');
  });

  it('threshold=30 → a 27-char note is short; threshold=15 → same note is valid', () => {
    const note = 'Исправлен краш при загрузке'; // 27 chars
    expect(createValidation(30).validateReleaseNote(note)).toBe('short');
    expect(createValidation(15).validateReleaseNote(note)).toBe('valid');
  });

  it('threshold=1 → any len>=1 note is valid (D-13 min boundary)', () => {
    const v = createValidation(1);
    expect(v.validateReleaseNote('a')).toBe('valid');
  });

  it('createValidation(DEFAULT_THRESHOLD) preserves all existing skip/empty/placeholder classifications', () => {
    const v = createValidation(DEFAULT_THRESHOLD);
    expect(v.validateReleaseNote(SKIP_MARKER)).toBe('skip');
    expect(v.validateReleaseNote('')).toBe('empty');
    expect(v.validateReleaseNote('TODO')).toBe('placeholder');
    expect(v.validateReleaseNote('a valid thirty-char note ok')).toBe('valid');
  });
});

describe('DEFAULT_THRESHOLD constant (D-14)', () => {
  it('is 15 — the fallback before /api/config resolves, also the Zod default', () => {
    expect(DEFAULT_THRESHOLD).toBe(15);
  });
});

describe('categoryPriority (D-04)', () => {
  it('places skip between placeholder and valid', () => {
    expect(categoryPriority.skip).toBe(3);
    expect(categoryPriority.valid).toBe(4);
  });

  it('honors the full problematic-first ordering empty < short < placeholder < skip < valid', () => {
    expect(categoryPriority.empty).toBeLessThan(categoryPriority.short);
    expect(categoryPriority.short).toBeLessThan(categoryPriority.placeholder);
    expect(categoryPriority.placeholder).toBeLessThan(categoryPriority.skip);
    expect(categoryPriority.skip).toBeLessThan(categoryPriority.valid);
  });

  it('has an entry for every ValidationCategory (exhaustive)', () => {
    const categories: ValidationCategory[] = ['empty', 'short', 'placeholder', 'skip', 'valid'];
    for (const cat of categories) {
      expect(categoryPriority[cat]).toBeDefined();
    }
  });
});

describe('countByCategory (D-10)', () => {
  const v = createValidation(DEFAULT_THRESHOLD);
  it('counts skip separately from valid and totals all issues', () => {
    const categories = new Map<string, ValidationCategory>([
      ['P-1', 'skip'],
      ['P-2', 'valid'],
    ]);
    const counts = v.countByCategory(categories);
    expect(counts.skip).toBe(1);
    expect(counts.valid).toBe(1);
    expect(counts.total).toBe(2);
  });

  it('initializes skip to 0 for an empty map', () => {
    const counts = v.countByCategory(new Map());
    expect(counts.skip).toBe(0);
    expect(counts.total).toBe(0);
  });
});

describe('validateIssues (D-02 skip-first propagation)', () => {
  const v = createValidation(DEFAULT_THRESHOLD);
  it('marks an issue whose releaseNote is the marker as skip', () => {
    const map = v.validateIssues([
      { key: 'P-1', releaseNote: '<no-release-notes>' } as never,
    ]);
    expect(map.get('P-1')).toBe('skip');
  });
});
