import type { Issue } from '../../../shared/types/issue';

export type SortKey = 'key' | 'summary' | 'priority' | 'resolutiondate';
export type SortDirection = 'asc' | 'desc';

const PRIORITY_WEIGHT: Record<string, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
};

/**
 * Sort issues by key (D-20). Returns new array.
 * priority sorts by mapped weight; resolutiondate by ISO string.
 */
export function sortIssues(issues: Issue[], key: SortKey, direction: SortDirection): Issue[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...issues].sort((a, b) => {
    let cmp = 0;
    if (key === 'key') {
      cmp = a.key.localeCompare(b.key);
    } else if (key === 'summary') {
      cmp = a.summary.localeCompare(b.summary);
    } else if (key === 'priority') {
      const wa = PRIORITY_WEIGHT[a.priority?.name ?? ''] ?? 99;
      const wb = PRIORITY_WEIGHT[b.priority?.name ?? ''] ?? 99;
      cmp = wa - wb;
    } else if (key === 'resolutiondate') {
      cmp = (a.resolutiondate ?? '').localeCompare(b.resolutiondate ?? '');
    }
    return cmp * factor;
  });
}
