import { describe, it, expect } from 'vitest';
import { Bug, BookOpen, ListTodo, Target, GitBranch, Square } from 'lucide-react';
import { getIssueTypeIcon } from './issueTypeIcons.js';

describe('getIssueTypeIcon', () => {
  describe('canonical issuetype names', () => {
    it('maps Bug → Bug icon with var(--error)', () => {
      const result = getIssueTypeIcon('Bug');
      expect(result.Icon).toBe(Bug);
      expect(result.color).toBe('var(--error)');
    });

    it('maps Story → BookOpen icon with var(--accent)', () => {
      const result = getIssueTypeIcon('Story');
      expect(result.Icon).toBe(BookOpen);
      expect(result.color).toBe('var(--accent)');
    });

    it('maps Task → ListTodo icon with var(--success)', () => {
      const result = getIssueTypeIcon('Task');
      expect(result.Icon).toBe(ListTodo);
      expect(result.color).toBe('var(--success)');
    });

    it('maps Epic → Target icon with var(--warning)', () => {
      const result = getIssueTypeIcon('Epic');
      expect(result.Icon).toBe(Target);
      expect(result.color).toBe('var(--warning)');
    });

    it('maps Sub-task → GitBranch icon with var(--text-muted)', () => {
      const result = getIssueTypeIcon('Sub-task');
      expect(result.Icon).toBe(GitBranch);
      expect(result.color).toBe('var(--text-muted)');
    });

    it('maps Subtask (alt spelling) → GitBranch icon with var(--text-muted)', () => {
      const result = getIssueTypeIcon('Subtask');
      expect(result.Icon).toBe(GitBranch);
      expect(result.color).toBe('var(--text-muted)');
    });
  });

  describe('case-insensitivity', () => {
    it('treats "bug" the same as "Bug"', () => {
      expect(getIssueTypeIcon('bug').color).toBe(getIssueTypeIcon('Bug').color);
      expect(getIssueTypeIcon('bug').Icon).toBe(getIssueTypeIcon('Bug').Icon);
    });

    it('treats "BUG" the same as "Bug"', () => {
      expect(getIssueTypeIcon('BUG').Icon).toBe(Bug);
      expect(getIssueTypeIcon('BUG').color).toBe('var(--error)');
    });

    it('treats "STORY" the same as "Story"', () => {
      expect(getIssueTypeIcon('STORY').Icon).toBe(BookOpen);
    });
  });

  describe('default fallback', () => {
    it('maps an unknown name → Square icon with var(--text-muted)', () => {
      const result = getIssueTypeIcon('Unknown');
      expect(result.Icon).toBe(Square);
      expect(result.color).toBe('var(--text-muted)');
    });

    it('maps an empty string → default', () => {
      const result = getIssueTypeIcon('');
      expect(result.Icon).toBe(Square);
      expect(result.color).toBe('var(--text-muted)');
    });

    it('maps undefined → default', () => {
      const result = getIssueTypeIcon(undefined as unknown as string);
      expect(result.Icon).toBe(Square);
      expect(result.color).toBe('var(--text-muted)');
    });

    it('trims surrounding whitespace before lookup', () => {
      const result = getIssueTypeIcon('  Bug  ');
      expect(result.Icon).toBe(Bug);
      expect(result.color).toBe('var(--error)');
    });
  });

  describe('localized (Russian) issuetype names', () => {
    it('maps Ошибка → Bug icon with var(--error)', () => {
      const result = getIssueTypeIcon('Ошибка');
      expect(result.Icon).toBe(Bug);
      expect(result.color).toBe('var(--error)');
    });

    it('maps История → BookOpen icon with var(--accent)', () => {
      const result = getIssueTypeIcon('История');
      expect(result.Icon).toBe(BookOpen);
      expect(result.color).toBe('var(--accent)');
    });

    it('maps Задача → ListTodo icon with var(--success)', () => {
      const result = getIssueTypeIcon('Задача');
      expect(result.Icon).toBe(ListTodo);
      expect(result.color).toBe('var(--success)');
    });

    it('maps Подзадача → GitBranch icon with var(--text-muted)', () => {
      const result = getIssueTypeIcon('Подзадача');
      expect(result.Icon).toBe(GitBranch);
      expect(result.color).toBe('var(--text-muted)');
    });

    it('treats Russian names case-insensitively', () => {
      expect(getIssueTypeIcon('ошибка').Icon).toBe(getIssueTypeIcon('Ошибка').Icon);
      expect(getIssueTypeIcon('ОШИБКА').Icon).toBe(getIssueTypeIcon('Ошибка').Icon);
    });
  });

  describe('Jira "*"-suffixed subtype names', () => {
    it('maps "Bug*" → Bug icon', () => {
      expect(getIssueTypeIcon('Bug*').Icon).toBe(Bug);
    });

    it('maps "Task*" → ListTodo icon', () => {
      expect(getIssueTypeIcon('Task*').Icon).toBe(ListTodo);
    });

    it('maps "Sub-task*" → GitBranch icon', () => {
      expect(getIssueTypeIcon('Sub-task*').Icon).toBe(GitBranch);
    });
  });
});
