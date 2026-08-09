import { describe, it, expect } from 'vitest';
import { buildSummary } from './summary.js';

describe('buildSummary', () => {
  it('returns "Групп: 2 • Задач: 5 • С правками: 3" for (2, 5, 3)', () => {
    expect(buildSummary(2, 5, 3)).toBe('Групп: 2 • Задач: 5 • С правками: 3');
  });

  it('still shows the third segment when editedCount=0', () => {
    expect(buildSummary(2, 5, 0)).toBe('Групп: 2 • Задач: 5 • С правками: 0');
  });

  it('flat mode (1 group) → "Групп: 1 • ..."', () => {
    expect(buildSummary(1, 10, 0)).toBe('Групп: 1 • Задач: 10 • С правками: 0');
  });

  it('uses the literal "•" bullet character between segments', () => {
    const result = buildSummary(2, 5, 3);
    expect(result).toContain('•');
    expect(result.split('•').length).toBe(3); // two bullets → three segments
  });
});
