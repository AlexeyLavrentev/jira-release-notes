import type { SearchResponse } from '../../../shared/types/issue';
import type { ErrorResponse } from '../../../shared/types/issue';

interface IssueTableProps {
  data: SearchResponse | undefined;
  isLoading: boolean;
  error: unknown;
  hasSearched: boolean;
  onRetry?: () => void;
  tableRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Issue table (D-18, D-19, D-21, D-23, D-05, D-07, D-38).
 * 9 columns, skeleton loading, empty state, truncated Alert, error with retry.
 */
export function IssueTable({ data, isLoading, error, hasSearched, onRetry, tableRef }: IssueTableProps) {
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
        <div
          role="alert"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--error)',
            borderRadius: 12,
            padding: '1.5rem',
            color: 'var(--error)',
          }}
        >
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

  const issues = data?.issues ?? [];
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
    <div ref={tableRef} style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
      {/* Truncated Alert (D-05) */}
      {truncated && (
        <div
          role="alert"
          style={{
            margin: '0.75rem 1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255,159,10,0.1)',
            border: '1px solid var(--warning)',
            borderRadius: 8,
            color: 'var(--warning)',
            fontSize: '0.8125rem',
          }}
        >
          Показано {fetched} из {total}. Уточните критерии для полноты.
        </div>
      )}

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
          {issues.map((issue) => (
            <tr key={issue.key} style={{ borderBottom: '1px solid var(--border)' }}>
              <Td>
                <code style={{ fontSize: '0.75rem' }}>{issue.key}</code>
              </Td>
              <Td>{issue.summary}</Td>
              <Td>
                {issue.issuetype.iconUrl && (
                  <img src={issue.issuetype.iconUrl} alt="" style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} />
                )}
                {issue.issuetype.name}
              </Td>
              <Td>{issue.status.name}</Td>
              <Td>{issue.priority?.name ?? '—'}</Td>
              <Td>{issue.components.map((c) => c.name).join(', ') || '—'}</Td>
              <Td>{issue.fixVersions.map((v) => v.name).join(', ') || '—'}</Td>
              <td title={issue.releaseNote} style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                {issue.releaseNote.length > 80
                  ? issue.releaseNote.slice(0, 80) + '…'
                  : issue.releaseNote || '—'}
              </td>
              <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top', color: 'var(--text-muted)' }}>—</td>
            </tr>
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
        padding: '0.5rem 0.75rem',
        textAlign: 'left',
        fontWeight: 600,
        color: 'var(--text-muted)',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>{children}</td>;
}

function SkeletonTable() {
  return (
    <div aria-busy="true" style={{ padding: '0 1.5rem' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          style={{
            height: '2.25rem',
            background: 'var(--border)',
            borderRadius: 6,
            marginBottom: '0.5rem',
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '0.375rem 1rem',
  borderRadius: 8,
  border: '1px solid var(--error)',
  background: 'transparent',
  color: 'var(--error)',
  fontWeight: 500,
  cursor: 'pointer',
};
