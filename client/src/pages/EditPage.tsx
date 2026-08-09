import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { searchQueryKey } from '../hooks/useSearch.js';
import { useEdits } from '../context/EditsContext.js';
import type { SearchResponse } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';

/**
 * EditPage (Phase 4) — full-screen release-note editor for a single issue.
 *
 * Reads the issue from the React Query cache via queryClient.getQueryData
 * (NOT useSearch — D-05/D-19 — avoids a background refetch from staleTime:0).
 * Edits persist to sessionStorage through the EditsContext (debounced).
 *
 * Plan 01 = tracer slice: route + cache read + textarea + persistence.
 * Plan 02 adds the split + preview; Plan 03 adds reset/indicators; Plan 04
 * adds ↑↓ nav, Esc, a11y polish, mobile tabs.
 */
function rebuildSearchBody(searchParams: URLSearchParams): SearchBody | null {
  const project = searchParams.get('project');
  const mode = searchParams.get('mode');
  if (!project || !mode) return null;
  const body: SearchBody = { mode: mode as SearchBody['mode'], project };
  const jql = searchParams.get('jql');
  const fixVersion = searchParams.get('fixVersion');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  if (jql) body.jql = jql;
  if (fixVersion) body.fixVersion = fixVersion;
  if (dateFrom) body.dateFrom = dateFrom;
  if (dateTo) body.dateTo = dateTo;
  return body;
}

export function EditPage() {
  const { key } = useParams<{ key: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { edits, setEdit } = useEdits();

  const searchBody = rebuildSearchBody(searchParams);
  const data = searchBody ? queryClient.getQueryData<SearchResponse>(searchQueryKey(searchBody)) : undefined;
  const issue = key ? (data?.issues.find((i) => i.key === key) ?? null) : null;

  const [text, setText] = useState(() => (key ? (edits[key] ?? issue?.releaseNote ?? '') : ''));

  // Reactive to :key change (↑↓ nav in Plan 04 changes params without remount).
  useEffect(() => {
    setText(key ? (edits[key] ?? issue?.releaseNote ?? '') : '');
    // edits + issue intentionally re-derived each key change; eslint-disable for edits inclusion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setText(next);
    if (key) setEdit(key, next);
  }

  // D-05: direct URL or stale cache → empty state, no crash.
  const emptyState = (!data && !issue) || (data && !issue);
  if (emptyState) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: 'var(--bg)',
          color: 'var(--text-muted)',
          padding: 24,
        }}
      >
        <p style={{ margin: 0 }}>Откройте задачу из списка поиска</p>
        <button onClick={() => navigate('/select')} style={doneBtnStyle}>
          К списку
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <header style={{ marginBottom: 16 }}>
          <code style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{issue!.key}</code>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 600 }}>{issue!.summary}</h1>
        </header>

        <label htmlFor="release-note-editor" style={{ display: 'block', marginBottom: 8 }}>
          Release note для {key}
        </label>
        <textarea
          id="release-note-editor"
          value={text}
          onChange={handleChange}
          placeholder="Введите текст release note (markdown)..."
          autoFocus
          style={{
            width: '100%',
            minHeight: '60vh',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            padding: 12,
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            resize: 'vertical',
          }}
        />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 16px' }}>{text.length} символов</p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => navigate('/select')} style={doneBtnStyle}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

const doneBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.5rem',
  borderRadius: 8,
  border: '1px solid var(--accent)',
  background: 'var(--accent)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.9375rem',
  cursor: 'pointer',
};
