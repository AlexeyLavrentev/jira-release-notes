import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { searchQueryKey } from '../hooks/useSearch.js';
import { useEdits } from '../context/EditsContext.js';
import { DocumentPreview } from '../components/DocumentPreview.js';
import { buildDocumentDoc } from '../lib/exporter/index.js';
import type { GroupingMode, ExportSortKey } from '../lib/exporter/index.js';
import type { SortDirection } from '../lib/sort.js';
import type { SearchResponse } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';

/**
 * ExportPage (Phase 5 tracer, D-01..D-37) — assembles the release-notes document from the cached
 * search issues + edits, renders a live preview, and (in later plans) exports it.
 *
 * Reads the React Query cache via queryClient.getQueryData (NOT useSearch with an enabled body —
 * D-03 — avoids a background refetch from staleTime:0). The SearchBody is rebuilt from the URL
 * search params with the SAME logic EditPage uses, so the cache key matches. If the body is null
 * or the cache misses → empty state (D-04), no fetch.
 *
 * Plan 01 (this tracer): route + cache read + URL-sync'd grouping select + DocumentPreview + empty
 * state. Plan 02 adds export buttons; Plan 03 replaces the minimal select with the real
 * GroupingControl/SortControl/DocHeaderInputs; Plan 04 adds mobile tabs + sticky bar + polish.
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

/** Coerce a URL param to a known union with a fallback (T-05-02 — unknown values fall back, never reach a sink). */
function asGrouping(v: string | null): GroupingMode {
  if (v === 'type' || v === 'component' || v === 'epic' || v === 'flat') return v;
  return 'flat';
}
function asSortKey(v: string | null): ExportSortKey {
  if (v === 'priority' || v === 'resolutiondate' || v === 'key') return v;
  return 'priority';
}
function asDir(v: string | null): SortDirection {
  return v === 'asc' ? 'asc' : 'desc';
}

export function ExportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { edits } = useEdits();

  // D-11 defaults: group='flat', sort='priority', dir='desc'. version/date default to ''.
  const group = asGrouping(searchParams.get('group'));
  const sort = asSortKey(searchParams.get('sort'));
  const dir = asDir(searchParams.get('dir'));
  const version = searchParams.get('version') ?? '';
  const date = searchParams.get('date') ?? '';

  // D-03 — read the cache, no refetch. Mirrors EditPage's rebuildSearchBody + getQueryData.
  const searchBody = rebuildSearchBody(searchParams);
  const data = searchBody
    ? queryClient.getQueryData<SearchResponse>(searchQueryKey(searchBody))
    : undefined;
  const issues = data?.issues ?? [];

  function setControl(partial: Partial<Record<'group' | 'sort' | 'dir' | 'version' | 'date', string>>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(partial)) {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next, { replace: true });
  }

  const doc = useMemo(
    () => buildDocumentDoc(group, issues, edits, sort, dir, version, date),
    [group, issues, edits, sort, dir, version, date],
  );

  // D-04 — empty state: no cache / no issues. Reuse EditPage's empty-state markup (copy differs).
  if (!data || issues.length === 0) {
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
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>
          Сначала найдите задачи
        </h1>
        <p style={{ margin: 0, maxWidth: 420, textAlign: 'center' }}>
          Откройте поиск, выберите задачи — затем соберите документ.
        </p>
        <button onClick={() => navigate('/select')} style={ghostBtnStyle}>
          К поиску
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 24 }}>
        <header
          style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={() => navigate('/select')}
            aria-label="Вернуться к списку задач"
            style={backBtnStyle}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Назад</span>
          </button>
          {/* UI-SPEC: the controls-panel page header is Body 15px/600 — NOT a large H1.
              DocumentPreview's rendered '# Release Notes' carries the big-type / H1 role on this
              page, so the utility header is a styled <div> to avoid a duplicate <h1> (a11y). */}
          <div style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Сборка документа</div>
        </header>

        {/* Minimal inline control row (tracer). Plan 03 replaces this with the real
            GroupingControl/SortControl/DocHeaderInputs segmented + select + inputs. */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            htmlFor="grouping-select"
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}
          >
            Группировка
          </label>
          <select
            id="grouping-select"
            aria-label="Шаблон группировки"
            value={group}
            onChange={(e) => setControl({ group: e.target.value })}
            style={selectStyle}
          >
            <option value="type">По типу</option>
            <option value="component">По компоненту</option>
            <option value="epic">По эпику</option>
            <option value="flat">Без групп</option>
          </select>
        </div>

        <DocumentPreview doc={doc} />
      </div>
    </div>
  );
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontWeight: 500,
  fontSize: '0.9375rem',
  cursor: 'pointer',
};

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '0.375rem 0.75rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.9375rem',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.9375rem',
};
