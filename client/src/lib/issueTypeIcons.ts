import {
  Bug,
  BookOpen,
  ListTodo,
  Target,
  GitBranch,
  Square,
  Sparkles,
  ArrowUpCircle,
  Flag,
  type LucideIcon,
} from 'lucide-react';

/**
 * Issuetype → icon + semantic color mapping (Phase 6 CONTEXT D-04, D-05).
 *
 * Replaces Jira's hosted `<img src={iconUrl}>` with bundled lucide-react SVG icons.
 * Colors are `var(--*)` strings so they adapt to dark mode automatically
 * (apple-design "colors that adapt to light/dark" tactical rule).
 *
 * The lookup key is `issuetype.name` (Jira returns names like "Bug", "Story",
 * "Task", "Epic", "Sub-task"). The lookup is case-insensitive and trims
 * whitespace to be defensive against Jira-instance name casing. Any unknown
 * name falls through to the Square default (T-06-03 mitigation: the name is
 * used ONLY as a record-lookup key, never as HTML/selector — a malicious name
 * simply renders the generic icon).
 */
export type IssueTypeIconInfo = { Icon: LucideIcon; color: string };

const ISSUETYPE_MAP: Record<string, IssueTypeIconInfo> = {
  // English (system names; "*" suffix = disabled/customized subtype Jira sometimes returns)
  bug: { Icon: Bug, color: 'var(--error)' },
  'bug*': { Icon: Bug, color: 'var(--error)' },
  story: { Icon: BookOpen, color: 'var(--accent)' },
  task: { Icon: ListTodo, color: 'var(--success)' },
  'task*': { Icon: ListTodo, color: 'var(--success)' },
  epic: { Icon: Target, color: 'var(--warning)' },
  'sub-task': { Icon: GitBranch, color: 'var(--text-muted)' },
  'sub-task*': { Icon: GitBranch, color: 'var(--text-muted)' },
  subtask: { Icon: GitBranch, color: 'var(--text-muted)' },
  // Russian (localized Jira instances — e.g. "Ошибка" instead of "Bug")
  ошибка: { Icon: Bug, color: 'var(--error)' },
  история: { Icon: BookOpen, color: 'var(--accent)' },
  задача: { Icon: ListTodo, color: 'var(--success)' },
  подзадача: { Icon: GitBranch, color: 'var(--text-muted)' },
  // Common additional types
  'новая функциональность': { Icon: Sparkles, color: 'var(--accent)' },
  улучшение: { Icon: ArrowUpCircle, color: 'var(--success)' },
  initiative: { Icon: Flag, color: 'var(--warning)' },
  инициатива: { Icon: Flag, color: 'var(--warning)' },
};

const DEFAULT: IssueTypeIconInfo = { Icon: Square, color: 'var(--text-muted)' };

/**
 * Resolve a lucide icon + semantic color for the given issuetype name.
 * Case-insensitive, trims whitespace, defaults to Square / var(--text-muted).
 */
export function getIssueTypeIcon(name: string): IssueTypeIconInfo {
  const key = (name ?? '').trim().toLowerCase();
  return ISSUETYPE_MAP[key] ?? DEFAULT;
}
