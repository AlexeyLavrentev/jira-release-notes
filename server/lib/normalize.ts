import type { JiraRawIssue, JiraRenderedFields } from '../../shared/types/jira.js';
import type { Issue } from '../../shared/types/issue.js';

/**
 * Field value normalization (CONTEXT.md D-27, PITFALL-4).
 * Handles: string, {value}, [{value}], null/undefined → plain string.
 * Raw value for edit (no HTML reformatting per D-28).
 */
export function normalizeFieldValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      // Multi-select: [{value: 'x'}, ...] → first value, or join
      const items = value
        .map((v) => normalizeFieldValue(v))
        .filter((v) => v.length > 0);
      return items.join(', ');
    }
    const obj = value as { value?: unknown; name?: unknown };
    if (typeof obj.value === 'string') return obj.value;
    if (typeof obj.name === 'string') return obj.name;
  }
  return String(value);
}

/** Extract {id, name} from a Jira field object, null if missing (D-31). */
export function normalizeIdName(obj: unknown): { id: string; name: string } | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as { id?: string; name?: string };
  if (!o.name) return null;
  return { id: String(o.id ?? ''), name: o.name };
}

/** Map Jira components array to clean {id, name}[], [] for null (D-29). */
export function normalizeComponents(arr: unknown): { id: string; name: string }[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((c) => normalizeIdName(c))
    .filter((c): c is { id: string; name: string } => c !== null);
}

/** Map Jira fixVersions array to clean {id, name, released}[], [] for null (D-29). */
export function normalizeFixVersions(
  arr: unknown,
): { id: string; name: string; released: boolean }[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => {
      const idName = normalizeIdName(v);
      if (!idName) return null;
      const released = Boolean((v as { released?: boolean }).released);
      return { ...idName, released };
    })
    .filter((v): v is { id: string; name: string; released: boolean } => v !== null);
}

/**
 * Resolve epic from a raw issue via the configured Epic Link field (CONTEXT.md D-11).
 * epicLinkFieldValue is the issue's epic link key (e.g. "PROJ-123"); parent fallback.
 */
export function resolveEpic(
  raw: JiraRawIssue,
  epicLinkFieldId: string | null,
): { key: string; summary: string | null } | null {
  if (!epicLinkFieldId) return null;
  const epicKey = raw.fields[epicLinkFieldId];
  if (typeof epicKey === 'string' && epicKey.length > 0) {
    return { key: epicKey, summary: null };
  }
  // Fallback: parent field (for sub-tasks whose parent is an epic)
  const parent = raw.fields.parent;
  if (parent?.key) {
    return { key: parent.key, summary: parent.fields?.summary ?? null };
  }
  return null;
}

/** Map a raw Jira issue to the clean Issue type (CONTEXT.md D-29, D-31, D-32).
 * Empty defaults applied; releaseNote read by configured field ID (D-25, FIELD-01).
 */
export function normalizeIssue(
  raw: JiraRawIssue,
  releaseNoteFieldId: string,
  epicLinkFieldId: string | null,
): Issue {
  const f = raw.fields;
  const issuetype = normalizeIdName(f.issuetype);
  const status = normalizeIdName(f.status);
  const priority = normalizeIdName(f.priority);

  return {
    key: raw.key,
    summary: typeof f.summary === 'string' ? f.summary : '',
    releaseNote: normalizeFieldValue(f[releaseNoteFieldId]),
    issuetype: issuetype
      ? { ...issuetype, iconUrl: (f.issuetype as { iconUrl?: string })?.iconUrl }
      : { name: '', id: '' },
    status: status ?? { name: '', id: '' },
    priority,
    components: normalizeComponents(f.components),
    fixVersions: normalizeFixVersions(f.fixVersions),
    epic: resolveEpic(raw, epicLinkFieldId),
    assignee: normalizeUserName(f.assignee),
    reporter: normalizeUserName(f.reporter),
    created: typeof f.created === 'string' ? f.created : '',
    updated: typeof f.updated === 'string' ? f.updated : '',
    resolutiondate: typeof f.resolutiondate === 'string' ? f.resolutiondate : null,
  };
}

/** Extract display name from a Jira user field, null when absent/unassigned. */
export function normalizeUserName(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as { displayName?: string; name?: string };
  return u.displayName ?? u.name ?? null;
}

/** Read rendered HTML for the release note field (D-06 preview, issue/:key only). */
export function getRenderedReleaseNote(
  rendered: JiraRenderedFields | undefined,
  releaseNoteFieldId: string,
): string | undefined {
  return rendered?.[releaseNoteFieldId];
}
