import { useMemo, useState } from 'react';
import type { SearchResponse } from '../../../shared/types/issue';
import { IssueRow } from './IssueRow.js';
import { ValidationFilter } from './ValidationFilter.js';
import {
  validateIssues,
  countByCategory,
  categoryPriority,
  type ValidationFilterMode,
} from '../lib/validation.js';

interface IssueTableProps {
  data: SearchResponse | undefined;
  isLoading: boolean;
  error: unknown;
  hasSearched: boolean;
  onRetry?: () => void;
  tableRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Issue table (D-18..D-24, D-32..D-38).
 * Integrates validation (colors, flags, filter, counters) and expandable rows.
 */
export function IssueTable({ data, isLoading, error, hasSearched, onRetry, tableRef }: IssueTableProps) {
  const [validationFilter, setValidationFilter] = useState<ValidationFilterMode>('all');

  const issues = data?.issues ?? [];
  const categories = useMemo(() => validateIssues(issues), [issues]);
  const counts = useMemo(() => countByCategory(categories), [categories]);

  // Sort: problematic first (D-35), filter by mode (D-33)
  const visibleIssues = useMemo(() => {
    const filtered = issues.filter((issue) => {
      const cat = categories.get(issue.key) ?? 'valid';
      if (validationFilter === 'problematic') return cat !== 'valid';
      if (validationFilter === 'valid') return cat === 'valid';
      return true;
    });
    // Sort: problematic first (categoryPriority ascending)
    return [...filtered].sort((a, b) => {
      const ca = categories.get(a.key) ?? 'valid';
      const cb = categories.get(b.key) ?? 'valid';
      return categoryPriority[ca] - categoryPriority[cb];
    });
  }, [issues, categories, validationFilter]);

  // Before first search
  if (!hasSearched && !data && !isLoading && !error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Заполните критерии и нажмите «Найти»
      </div>
    );
  }

  // Loading — skeleton rows (D-07)
  if (isLoading) {
    return (
      <div ref={tableRef} style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
        <SkeletonTable />
      </div>
    );
  }

  // Error (D-40)
  if (error) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return (
      <div style={{ padding: '2rem' }}>
        <div role="alert" style={errorBoxStyle}>
          <strong>Ошибка: {msg}</strong>
          {onRetry && (
            <button onClick={onRetry} style={{ ...btnStyle, marginLeft: '1rem' }}>
              Повторить
            </button>
          )}
        </div>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const fetched = data?.fetched ?? 0;
  const truncated = data?.truncated ?? false;

  // Empty result (D-23)
  if (issues.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
        Ничего не найдено. Измените критерии поиска.
      </div>
    );
  }

  return (
    <div ref={tableRef} style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
      {/* Truncated Alert (D-05) */}
      {truncated && (
        <div role="alert" style={truncatedAlertStyle}>
          Показано {fetched} из {total}. Уточните критерии для полноты.
        </div>
      )}

      {/* Validation filter + counters (D-33, D-34) */}
      <ValidationFilter counts={counts} activeFilter={validationFilter} onFilterChange={setValidationFilter} />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            <Th>Key</Th>
            <Th>Summary</Th>
            <Th>Тип</Th>
            <Th>Статус</Th>
            <Th>Приоритет</Th>
            <Th>Компоненты</Th>
            <Th>Fix Version</Th>
            <Th>Release Note</Th>
            <Th>Флаг</Th>
          </tr>
        </thead>
        <tbody>
          {visibleIssues.map((issue) => (
            <IssueRow key={issue.key} issue={issue} category={categories.get(issue.key) ?? 'valid'} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      style={{
        position: 'sticky',
        top: 0,
        background: 'var(--surface)',
        zIndex: 1,
        padding: '0.5rem 0.75rem',
        textAlign: 'left',
        fontWeight: 600,
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid var(--border)',
      }}
    >
      {children}
    </th>
  );
}

function SkeletonTable() {
  return (
    <div aria-busy="true" style={{ padding: '0 1.5rem' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          style={{ height: '2.25rem', background: 'var(--border)', borderRadius: 6, marginBottom: '0.5rem', opacity: 0.5 }}
        />
      ))}
    </div>
  );
}

const errorBoxStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--error)',
  borderRadius: 12,
  padding: '1.5rem',
  color: 'var(--error)',
};

const truncatedAlertStyle: React.CSSProperties = {
  margin: '0.75rem 1.5rem',
  padding: '0.75rem 1rem',
  background: 'rgba(255,159,10,0.1)',
  border: '1px solid var(--warning)',
  borderRadius: 8,
  color: 'var(--warning)',
  fontSize: '0.8125rem',
};

const btnStyle: React.CSSProperties = {
  padding: '0.375rem 1rem',
  borderRadius: 8,
  border: '1px solid var(--error)',
  background: 'transparent',
  color: 'var(--error)',
  fontWeight: 500,
  cursor: 'pointer',
};
