import { describe, it, expect } from 'vitest';
import { buildJql, parseVersion, meetsPatRequirement, ISSUES_CAP } from './jira-client.js';
import type { SearchBody } from '../../shared/schemas/search.js';

describe('buildJql', () => {
  it('mode=jql uses body.jql', () => {
    const jql = buildJql({ mode: 'jql', project: 'TEST', jql: 'project = TEST AND status = Done' } as SearchBody);
    expect(jql).toBe('project = TEST AND status = Done ORDER BY resolution DESC, priority DESC');
  });

  it('mode=jql falls back to project= when no jql', () => {
    const jql = buildJql({ mode: 'jql', project: 'TEST' } as SearchBody);
    expect(jql).toBe('project = TEST ORDER BY resolution DESC, priority DESC');
  });

  it('mode=fixVersion builds project + fixVersion', () => {
    const jql = buildJql({ mode: 'fixVersion', project: 'PROJ', fixVersion: 'v1.0' } as SearchBody);
    expect(jql).toBe('project = PROJ AND fixVersion = "v1.0" ORDER BY resolution DESC, priority DESC');
  });

  it('mode=dateRange builds project + date filters', () => {
    const jql = buildJql({
      mode: 'dateRange',
      project: 'PROJ',
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
    } as SearchBody);
    expect(jql).toContain('project = PROJ');
    expect(jql).toContain('resolutiondate >= "2026-01-01"');
    expect(jql).toContain('resolutiondate <= "2026-02-01"');
    expect(jql).toContain('ORDER BY resolution DESC, priority DESC');
  });

  it('all modes end with ORDER BY resolution DESC, priority DESC', () => {
    const modes: SearchBody[] = [
      { mode: 'jql', project: 'T', jql: 'x' },
      { mode: 'fixVersion', project: 'T', fixVersion: 'v' },
      { mode: 'dateRange', project: 'T', dateFrom: '2026-01-01' },
    ];
    for (const m of modes) {
      expect(buildJql(m)).toMatch(/ORDER BY resolution DESC, priority DESC$/);
    }
  });

  it('escapes quotes in fixVersion value', () => {
    const jql = buildJql({ mode: 'fixVersion', project: 'T', fixVersion: 'bad"quote' } as SearchBody);
    expect(jql).toContain('"bad\\"quote"');
  });

  it('strips non-alphanumeric from project key', () => {
    const jql = buildJql({ mode: 'jql', project: 'TE;ST' } as SearchBody);
    expect(jql).toContain('project = TEST');
  });
});

describe('parseVersion', () => {
  it('parses major.minor.patch', () => {
    expect(parseVersion('8.14.0')).toEqual({ major: 8, minor: 14 });
    expect(parseVersion('9.5.1')).toEqual({ major: 9, minor: 5 });
  });
  it('handles missing minor', () => {
    expect(parseVersion('8')).toEqual({ major: 8, minor: 0 });
  });
});

describe('meetsPatRequirement', () => {
  it('true for 8.14+', () => {
    expect(meetsPatRequirement('8.14.0')).toBe(true);
    expect(meetsPatRequirement('9.0.0')).toBe(true);
    expect(meetsPatRequirement('10.1.5')).toBe(true);
  });
  it('false for <8.14', () => {
    expect(meetsPatRequirement('7.5.0')).toBe(false);
    expect(meetsPatRequirement('8.13.0')).toBe(false);
    expect(meetsPatRequirement('8.0.0')).toBe(false);
  });
});

describe('ISSUES_CAP', () => {
  it('is 2000', () => {
    expect(ISSUES_CAP).toBe(2000);
  });
});
