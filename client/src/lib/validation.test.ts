import { describe, it, expect } from 'vitest';
import {
  validateReleaseNote,
  validateIssues,
  countByCategory,
  categoryPriority,
  SKIP_MARKER,
  type ValidationCategory,
} from './validation.js';

/**
 * Direct unit coverage for validateReleaseNote — the core of SKIP-01/SKIP-02 (Phase 9).
 * Before this file, validateReleaseNote had no direct tests; its skip-marker contract is the
 * semantic backbone of the phase.
 *
 * Decision IDs reference .planning/phases/09-skip-markers/09-CONTEXT.md.
 */

describe('SKIP_MARKER constant (D-05)', () => {
  it('is exactly the canonical <no-release-notes> marker', () => {
    expect(SKIP_MARKER).toBe('<no-release-notes>');
  });
});

describe('validateReleaseNote — skip detection (D-05/D-06, SKIP-01)', () => {
  it('classifies the exact marker as skip', () => {
    expect(validateReleaseNote('<no-release-notes>')).toBe('skip');
  });

  it('classifies the marker with surrounding whitespace as skip (trimmed, D-06)', () => {
    expect(validateReleaseNote('  <no-release-notes>  ')).toBe('skip');
  });

  it('classifies the upper-case marker as skip (case-insensitive, D-06)', () => {
    expect(validateReleaseNote('<NO-RELEASE-NOTES>')).toBe('skip');
  });

  it('does NOT classify the marker inline with real text as skip (no false positives, D-06)', () => {
    // The marker appears, but surrounded by real descriptive text — this is a valid note.
    expect(validateReleaseNote('Исправлен баг <no-release-notes>')).toBe('valid');
  });

  it('does NOT classify the marker with extra chars as skip (exact-match only, D-06)', () => {
    expect(validateReleaseNote('<no-release-notes>extra')).toBe('valid');
  });
});

describe('validateReleaseNote — skip-first priority (D-02)', () => {
  it('still classifies genuinely empty strings as empty (skip check does not shadow empty)', () => {
    expect(validateReleaseNote('')).toBe('empty');
    expect(validateReleaseNote('   ')).toBe('empty');
  });

  it('still classifies placeholder/short correctly (skip did not reorder other checks)', () => {
    expect(validateReleaseNote('TODO')).toBe('placeholder');
    expect(validateReleaseNote('ок')).toBe('short');
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
  it('counts skip separately from valid and totals all issues', () => {
    const categories = new Map<string, ValidationCategory>([
      ['P-1', 'skip'],
      ['P-2', 'valid'],
    ]);
    const counts = countByCategory(categories);
    expect(counts.skip).toBe(1);
    expect(counts.valid).toBe(1);
    expect(counts.total).toBe(2);
  });

  it('initializes skip to 0 for an empty map', () => {
    const counts = countByCategory(new Map());
    expect(counts.skip).toBe(0);
    expect(counts.total).toBe(0);
  });
});

describe('validateIssues (D-02 skip-first propagation)', () => {
  it('marks an issue whose releaseNote is the marker as skip', () => {
    const map = validateIssues([
      { key: 'P-1', releaseNote: '<no-release-notes>' } as never,
    ]);
    expect(map.get('P-1')).toBe('skip');
  });
});
