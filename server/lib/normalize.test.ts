import { describe, it, expect } from 'vitest';
import {
  normalizeFieldValue,
  normalizeIdName,
  normalizeComponents,
  normalizeFixVersions,
  normalizeIssue,
  normalizeUserName,
  resolveEpic,
} from './normalize.js';
import type { JiraRawIssue } from '../../shared/types/jira.js';

describe('normalizeFieldValue', () => {
  it('passes through string', () => {
    expect(normalizeFieldValue('text')).toBe('text');
  });
  it('extracts {value} from select object', () => {
    expect(normalizeFieldValue({ value: 'sel' })).toBe('sel');
  });
  it('extracts name when no value', () => {
    expect(normalizeFieldValue({ name: 'byname' })).toBe('byname');
  });
  it('joins multi-select array', () => {
    expect(normalizeFieldValue([{ value: 'a' }, { value: 'b' }])).toBe('a, b');
  });
  it('returns empty for null', () => {
    expect(normalizeFieldValue(null)).toBe('');
  });
  it('returns empty for undefined', () => {
    expect(normalizeFieldValue(undefined)).toBe('');
  });
  it('stringifies unknown shapes', () => {
    expect(normalizeFieldValue(42)).toBe('42');
  });
});

describe('normalizeIdName', () => {
  it('extracts id+name', () => {
    expect(normalizeIdName({ id: '1', name: 'Bug' })).toEqual({ id: '1', name: 'Bug' });
  });
  it('returns null for missing name', () => {
    expect(normalizeIdName({ id: '1' })).toBeNull();
  });
  it('returns null for non-object', () => {
    expect(normalizeIdName(null)).toBeNull();
    expect(normalizeIdName('str')).toBeNull();
  });
});

describe('normalizeComponents', () => {
  it('maps valid array', () => {
    expect(normalizeComponents([{ id: '1', name: 'backend' }, { id: '2', name: 'frontend' }])).toEqual([
      { id: '1', name: 'backend' },
      { id: '2', name: 'frontend' },
    ]);
  });
  it('returns [] for null', () => {
    expect(normalizeComponents(null)).toEqual([]);
  });
  it('returns [] for undefined', () => {
    expect(normalizeComponents(undefined)).toEqual([]);
  });
  it('filters out items without name', () => {
    expect(normalizeComponents([{ id: '1' }, { id: '2', name: 'x' }])).toEqual([{ id: '2', name: 'x' }]);
  });
});

describe('normalizeFixVersions', () => {
  it('maps valid array with released flag', () => {
    expect(
      normalizeFixVersions([
        { id: '1', name: 'v1.0', released: true },
        { id: '2', name: 'v1.1', released: false },
      ]),
    ).toEqual([
      { id: '1', name: 'v1.0', released: true },
      { id: '2', name: 'v1.1', released: false },
    ]);
  });
  it('returns [] for null', () => {
    expect(normalizeFixVersions(null)).toEqual([]);
  });
});

describe('resolveEpic', () => {
  const raw = { key: 'T-1', fields: {} } as JiraRawIssue;
  it('returns null when epicLinkFieldId is null', () => {
    expect(resolveEpic(raw, null)).toBeNull();
  });
  it('extracts epic key from field', () => {
    const r = { key: 'T-1', fields: { 'cf-epic': 'EPIC-5' } } as unknown as JiraRawIssue;
    expect(resolveEpic(r, 'cf-epic')).toEqual({ key: 'EPIC-5', summary: null });
  });
  it('falls back to parent', () => {
    const r = {
      key: 'T-1',
      fields: { parent: { key: 'PARENT-1', fields: { summary: 'parent sum' } } },
    } as unknown as JiraRawIssue;
    expect(resolveEpic(r, null)).toBeNull();
  });
});

describe('normalizeIssue', () => {
  it('maps full raw issue to clean Issue', () => {
    const raw: JiraRawIssue = {
      key: 'PROJ-123',
      fields: {
        summary: 'Fix bug',
        issuetype: { name: 'Bug', id: '1', iconUrl: 'http://icon' },
        status: { name: 'Done', id: '5' },
        priority: { name: 'High', id: '2' },
        components: [{ id: 'c1', name: 'backend' }],
        fixVersions: [{ id: 'v1', name: 'v1.0', released: true }],
        assignee: { name: 'assignee_login', displayName: 'Исполнитель Юзеров' },
        reporter: { name: 'reporter_login', displayName: 'Автор Авторов' },
        created: '2026-01-01',
        updated: '2026-02-01',
        resolutiondate: '2026-02-01',
        customfield_10000: 'Release note text',
      },
    };
    const issue = normalizeIssue(raw, 'customfield_10000', null);
    expect(issue.key).toBe('PROJ-123');
    expect(issue.summary).toBe('Fix bug');
    expect(issue.releaseNote).toBe('Release note text');
    expect(issue.issuetype).toEqual({ name: 'Bug', id: '1', iconUrl: 'http://icon' });
    expect(issue.status).toEqual({ name: 'Done', id: '5' });
    expect(issue.priority).toEqual({ name: 'High', id: '2' });
    expect(issue.components).toEqual([{ id: 'c1', name: 'backend' }]);
    expect(issue.fixVersions).toEqual([{ id: 'v1', name: 'v1.0', released: true }]);
    expect(issue.epic).toBeNull();
    expect(issue.assignee).toBe('Исполнитель Юзеров');
    expect(issue.reporter).toBe('Автор Авторов');
    expect(issue.resolutiondate).toBe('2026-02-01');
  });

  it('applies empty defaults for missing fields', () => {
    const raw = { key: 'X-1', fields: {} } as unknown as JiraRawIssue;
    const issue = normalizeIssue(raw, 'customfield_10000', null);
    expect(issue.summary).toBe('');
    expect(issue.releaseNote).toBe('');
    expect(issue.components).toEqual([]);
    expect(issue.fixVersions).toEqual([]);
    expect(issue.epic).toBeNull();
    expect(issue.priority).toBeNull();
    expect(issue.assignee).toBeNull();
    expect(issue.reporter).toBeNull();
    expect(issue.resolutiondate).toBeNull();
  });
});

describe('normalizeUserName', () => {
  it('prefers displayName over login name', () => {
    expect(normalizeUserName({ name: 'login', displayName: 'Full Name' })).toBe('Full Name');
  });
  it('falls back to name when displayName is absent', () => {
    expect(normalizeUserName({ name: 'login' })).toBe('login');
  });
  it('returns null for unassigned (null) and empty objects', () => {
    expect(normalizeUserName(null)).toBeNull();
    expect(normalizeUserName(undefined)).toBeNull();
    expect(normalizeUserName({ active: true })).toBeNull();
  });
});
