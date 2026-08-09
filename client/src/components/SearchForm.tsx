import { useState, type FormEvent } from 'react';
import { useProjects } from '../hooks/useProjects.js';
import { useVersions } from '../hooks/useVersions.js';
import type { SearchBody } from '../../../shared/schemas/search';
import type { SearchMode } from '../lib/types.js';

export type { SearchMode };

interface SearchFormProps {
  onSubmit: (body: SearchBody) => void;
  initialValues?: Partial<SearchBody>;
}

const MODES: { value: SearchMode; label: string }[] = [
  { value: 'jql', label: 'JQL' },
  { value: 'fixVersion', label: 'Версия' },
  { value: 'dateRange', label: 'Даты' },
];

/**
 * Search form (D-10..D-17, D-41).
 * Tabs for mode, project Select, mode-specific inputs, inline validation, disabled submit.
 */
export function SearchForm({ onSubmit, initialValues }: SearchFormProps) {
  const [project, setProject] = useState(initialValues?.project ?? '');
  const [mode, setMode] = useState<SearchMode>((initialValues?.mode as SearchMode) ?? 'jql');
  const [jql, setJql] = useState(initialValues?.jql ?? '');
  const [fixVersion, setFixVersion] = useState(initialValues?.fixVersion ?? '');
  const [dateFrom, setDateFrom] = useState(initialValues?.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(initialValues?.dateTo ?? '');
  const [showUnreleased, setShowUnreleased] = useState(false);

  const projectsQuery = useProjects();
  const versionsQuery = useVersions(project || null);
  const projects = projectsQuery.data ?? [];
  const allVersions = versionsQuery.data ?? [];
  const versions = showUnreleased ? allVersions : allVersions.filter((v) => v.released);

  // Validation (D-15)
  const errors: string[] = [];
  if (!project) errors.push('Выберите проект');
  if (mode === 'jql' && !jql.trim()) errors.push('Введите JQL');
  if (mode === 'fixVersion' && !fixVersion) errors.push('Выберите версию');
  if (mode === 'dateRange') {
    if (!dateFrom) errors.push('Укажите дату начала');
    if (!dateTo) errors.push('Укажите дату окончания');
    if (dateFrom && dateTo && dateFrom > dateTo) errors.push('Дата начала позже даты окончания');
  }
  const isValid = errors.length === 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    const body: SearchBody = { mode, project };
    if (mode === 'jql') body.jql = jql;
    if (mode === 'fixVersion') body.fixVersion = fixVersion;
    if (mode === 'dateRange') {
      body.dateFrom = dateFrom;
      body.dateTo = dateTo;
    }
    onSubmit(body);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Mode Tabs (D-10) */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: mode === m.value ? 'var(--accent)' : 'var(--surface)',
              color: mode === m.value ? '#fff' : 'var(--text)',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Inputs grid (D-16) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {/* Project Select (D-11) */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Проект</span>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            style={inputStyle}
          >
            <option value="">Выберите проект</option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>
        </label>

        {/* Mode-specific inputs */}
        {mode === 'jql' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>JQL запрос</span>
            <textarea
              value={jql}
              onChange={(e) => setJql(e.target.value)}
              placeholder="project = PROJ AND status = Done AND ..."
              rows={3}
              style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
            />
          </label>
        )}

        {mode === 'fixVersion' && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Версия</span>
              <select
                value={fixVersion}
                onChange={(e) => setFixVersion(e.target.value)}
                style={inputStyle}
                disabled={!project}
              >
                <option value="">{project ? 'Выберите версию' : 'Сначала выберите проект'}</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} {v.released ? '' : '(unreleased)'}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', paddingTop: '1.5rem' }}>
              <input
                type="checkbox"
                checked={showUnreleased}
                onChange={(e) => setShowUnreleased(e.target.checked)}
              />
              <span style={{ fontSize: '0.8125rem' }}>показать unreleased</span>
            </label>
          </>
        )}

        {mode === 'dateRange' && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Дата начала</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Дата окончания</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
            </label>
          </>
        )}
      </div>

      {/* Errors + Submit (D-15) */}
      {errors.length > 0 && (
        <div style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>
          {errors.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}
      <button
        type="submit"
        disabled={!isValid}
        style={{
          padding: '0.5rem 1.5rem',
          borderRadius: 8,
          border: 'none',
          background: isValid ? 'var(--accent)' : 'var(--border)',
          color: isValid ? '#fff' : 'var(--text-muted)',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: isValid ? 'pointer' : 'not-allowed',
          alignSelf: 'flex-start',
        }}
      >
        Найти
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.375rem 0.625rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '0.875rem',
};
