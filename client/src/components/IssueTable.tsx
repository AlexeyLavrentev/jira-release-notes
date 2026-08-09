import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { SearchResponse } from '../../../shared/types/issue';
import { IssueRow } from './IssueRow.js';
import { MobileIssueCard } from './MobileIssueCard.js';
import { ValidationFilter } from './ValidationFilter.js';
import {
  validateIssues,
  countByCategory,
  categoryPriority,
  type ValidationFilterMode,
} from '../lib/validation.js';
import { sortIssues, type SortKey, type SortDirection } from '../lib/sort.js';

interface IssueTableProps {
  data: SearchResponse | undefined;
  isLoading: boolean;
  error: unknown;
  hasSearched: boolean;
  onRetry?: () => void;
  tableRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Issue table (D-18..D-24, D-29, D-32..D-38).
 * Validation + sorting + responsive (table desktop, cards mobile) + sticky header.
 */
export function IssueTable({ data, isLoading, error, hasSearched, onRetry, tableRef }: IssueTableProps) {
  const [validationFilter, setValidationFilter] = useState<ValidationFilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  // D-02 — instant React Router swap to /export (no transition/animation code per D-36).
  const navigate = useNavigate();

  const issues = data?.issues ?? [];
  const categories = useMemo(() => validateIssues(issues), [issues]);
  const counts = useMemo(() => countByCategory(categories), [categories]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  }

  // Filter + sort (D-20 manual sort disables validation autopriority, D-33 filter, D-35 autopriority)
  const visibleIssues = useMemo(() => {
    const filtered = issues.filter((issue) => {
      const cat = categories.get(issue.key) ?? 'valid';
      if (validationFilter === 'problematic') return cat !== 'valid';
      if (validationFilter === 'valid') return cat === 'valid';
      return true;
    });

    if (sortKey) {
      // Manual sort (D-20) — disables autopriority
      return sortIssues(filtered, sortKey, sortDirection);
    }
    // Autopriority: problematic first (D-35)
    return [...filtered].sort((a, b) => {
      const ca = categories.get(a.key) ?? 'valid';
      const cb = categories.get(b.key) ?? 'valid';
      return categoryPriority[ca] - categoryPriority[cb];
    });
  }, [issues, categories, validationFilter, sortKey, sortDirection]);

  // Before first search
  if (!hasSearched && !data && !isLoading && !error) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Заполните критерии и нажмите «Найти»
      </div>
    );
  }

  if (isLoading) {
    return (
      <div ref={tableRef} style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
        <SkeletonTable />
      </div>
    );
  }

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
      {truncated && (
        <div role="alert" style={truncatedAlertStyle}>
          Показано {fetched} из {total}. Уточните критерии для полноты.
        </div>
      )}

      {/* D-02 — «Собрать документ» entry button joins the ValidationFilter + counters row
          (appears only when issues exist — this block is after the issues.length===0 guard).
          Inline-right placement in a flex wrapper; the button sits to the right of the filter. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <ValidationFilter counts={counts} activeFilter={validationFilter} onFilterChange={setValidationFilter} />
        <button
          type="button"
          onClick={() => navigate('/export')}
          aria-label="Собрать документ release notes"
          style={buildDocBtnStyle}
        >
          Собрать документ
        </button>
      </div>

      {/* Desktop table (D-18, md+) */}
      <table className="hidden md:table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            <SortableTh sortKey="key" current={sortKey} direction={sortDirection} onSort={handleSort}>Key</SortableTh>
            <SortableTh sortKey="summary" current={sortKey} direction={sortDirection} onSort={handleSort}>Summary</SortableTh>
            <Th>Тип</Th>
            <Th>Статус</Th>
            <SortableTh sortKey="priority" current={sortKey} direction={sortDirection} onSort={handleSort}>Приоритет</SortableTh>
            <Th>Компоненты</Th>
            <Th>Fix Version</Th>
            <Th>Release Note</Th>
            <Th>Флаг</Th>
            <Th>Действия</Th>
          </tr>
        </thead>
        <tbody>
          {visibleIssues.map((issue) => (
            <IssueRow key={issue.key} issue={issue} category={categories.get(issue.key) ?? 'valid'} />
          ))}
        </tbody>
      </table>

      {/* Mobile cards (D-29, <md) */}
      <div className="block md:hidden" role="list">
        {visibleIssues.map((issue) => (
          <MobileIssueCard key={issue.key} issue={issue} category={categories.get(issue.key) ?? 'valid'} />
        ))}
      </div>
    </div>
  );
}

function SortableTh({
  sortKey,
  current,
  direction,
  onSort,
  children,
}: {
  sortKey: SortKey;
  current: SortKey | null;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  children: React.ReactNode;
}) {
  const isActive = current === sortKey;
  const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      onClick={() => onSort(sortKey)}
      style={{
        position: 'sticky',
        top: 0,
        background: 'var(--surface)',
        zIndex: 1,
        padding: '0.5rem 0.75rem',
        textAlign: 'left',
        fontWeight: 600,
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        borderBottom: '2px solid var(--border)',
      }}
    >
      {children}
      {isActive && (direction === 'asc' ? <ChevronUp size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> : <ChevronDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />)}
    </th>
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
        <div key={i} style={{ height: '2.25rem', background: 'var(--border)', borderRadius: 6, marginBottom: '0.5rem', opacity: 0.5 }} />
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

/**
 * buildDocBtnStyle (D-02, UI-SPEC #8) — byte-identical to EditPage.doneBtnStyle: solid accent
 * background, white text, 600 weight, 8px radius, 1px solid accent border. The entry CTA is the
 * single primary action of the /select → /export flow.
 */
const buildDocBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.5rem',
  borderRadius: 8,
  border: '1px solid var(--accent)',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.9375rem',
  cursor: 'pointer',
};
