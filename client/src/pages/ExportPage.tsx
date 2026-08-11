import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, FileCode } from 'lucide-react';
import { searchQueryKey } from '../hooks/useSearch.js';
import { useEdits } from '../context/EditsContext.js';
import { useValidation } from '../context/ValidationContext.js';
import { DocumentPreview } from '../components/DocumentPreview.js';
import { StateView } from '../components/StateView.js';
import { GroupingControl } from '../components/GroupingControl.js';
import { SortControl } from '../components/SortControl.js';
import { DocHeaderInputs } from '../components/DocHeaderInputs.js';
import {
  buildDocumentDoc,
  buildMarkdown,
  buildPlain,
  buildHtml,
  buildExportFilename,
  downloadFile,
} from '../lib/exporter/index.js';
import type { GroupingMode, ExportSortKey } from '../lib/exporter/index.js';
import type { SortDirection } from '../lib/sort.js';
import type { SearchResponse } from '../../../shared/types/issue';
import type { SearchBody } from '../../../shared/schemas/search';

/**
 * ExportPage (Phase 5) — assembles the release-notes document from the cached search issues +
 * edits, renders a live preview, and exports it to Markdown / plain text / HTML.
 *
 * Reads the React Query cache via queryClient.getQueryData (NOT useSearch with an enabled body —
 * D-03 — avoids a background refetch from staleTime:0). The SearchBody is rebuilt from the URL
 * search params with the SAME logic EditPage uses, so the cache key matches. If the body is null
 * or the cache misses → empty state (D-04), no fetch.
 *
 * Layout (Plan 04 composition):
 * - Desktop (md+, D-05): sticky controls panel (GroupingControl + SortControl + DocHeaderInputs +
 *   D-41 summary line + desktop export row) above the DocumentPreview card.
 * - Mobile (<md, D-27/D-28): «Контролы | Предпросмотр» tabs (default Предпросмотр) reusing the
 *   EditPage tablist/tabpanel pattern; a sticky bottom export bar.
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
  body.closedOnly = searchParams.get('closedOnly') !== '0';
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

type MobileTab = 'controls' | 'preview';

export function ExportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { edits } = useEdits();
  // Phase 10 D-08 — the bound validation factory. v.validateReleaseNote is threaded into
  // buildDocumentDoc as its trailing validateFn param (group.ts is pure and cannot reach the
  // context itself).
  const v = useValidation();
  // D-21 — export-failure error state. Shown in an inline --error box above the preview; cleared
  // on the next export attempt. Export NEVER clears edits (D-38/D-39) — the export path makes no
  // call to any edits-clearing API anywhere in this file (acceptance grep: zero matches).
  const [exportError, setExportError] = useState<string | null>(null);
  // D-27 — mobile tab state, default 'preview'.
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');

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
    () => buildDocumentDoc(group, issues, edits, sort, dir, version, date, v.validateReleaseNote),
    [group, issues, edits, sort, dir, version, date, v],
  );

  // D-41 — count of edited issues for the summary line.
  const editedCount = Object.keys(edits).length;

  /**
   * handleExport (D-21, D-22, D-40) — shared by all three export buttons. Builds the document
   * string in the requested format (buildHtml is async — unified pipeline), assembles a sanitized
   * filename (D-25/D-34), and triggers the client Blob download. Any failure surfaces the inline
   * error box; edits are never touched (D-38).
   */
  async function handleExport(ext: 'md' | 'txt' | 'html') {
    try {
      setExportError(null);
      const text = ext === 'md' ? buildMarkdown(doc) : ext === 'txt' ? buildPlain(doc) : await buildHtml(doc);
      const filename = buildExportFilename(version, date, ext);
      downloadFile(text, ext, filename);
    } catch {
      setExportError('Не удалось сформировать файл. Попробуйте ещё раз.');
    }
  }

  // D-04 — empty state: no cache / no issues. D-13: uses the shared StateView. Copy preserved
  // verbatim — ExportPage.test.tsx asserts "Сначала найдите задачи" + button "К поиску".
  if (!data || issues.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <StateView
          variant="empty"
          heading="Сначала найдите задачи"
          description="Откройте поиск, выберите задачи — затем соберите документ."
          cta={
            <button onClick={() => navigate('/select')} style={ghostBtnStyle}>
              К поиску
            </button>
          }
        />
      </div>
    );
  }

  return (
    // D-14 — responsive horizontal padding via Tailwind on the outer wrapper; inner maxWidth
    // container keeps vertical padding only (var(--space-5) 0).
    <div className="px-4 md:px-6" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <style>{EXPORT_CSS}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'var(--space-5) 0' }}>
        {/* Mobile tabs (D-27, <md): Контролы | Предпросмотр, default 'preview'. Hidden on desktop.
            Reuses EditPage's tablist pattern verbatim (role=tablist, Arrow L/R focus + switch). */}
        <div
          role="tablist"
          aria-label="Режим сборки"
          className="md:hidden"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              setMobileTab((t) => (t === 'controls' ? 'preview' : 'controls'));
              const target = e.key === 'ArrowRight' ? 'tab-preview' : 'tab-controls';
              document.getElementById(target)?.focus();
            }
          }}
          style={{ display: 'flex', gap: 8, marginBottom: 16 }}
        >
          <button
            role="tab"
            id="tab-controls"
            aria-selected={mobileTab === 'controls'}
            aria-controls="panel-controls"
            onClick={() => setMobileTab('controls')}
            style={tabBtnStyle(mobileTab === 'controls')}
          >
            Контролы
          </button>
          <button
            role="tab"
            id="tab-preview"
            aria-selected={mobileTab === 'preview'}
            aria-controls="panel-preview"
            onClick={() => setMobileTab('preview')}
            style={tabBtnStyle(mobileTab === 'preview')}
          >
            Предпросмотр
          </button>
        </div>

        {/* Controls panel — tabpanel on mobile (Контролы), always visible on desktop (md:block).
            UI-SPEC #2: sticky on desktop (top:64px below the AppHeader), NOT sticky on mobile
            (the responsive .rn-export-controls-panel rule in EXPORT_CSS toggles position via a
            min-width:768px media query — inline style can't express a breakpoint toggle). */}
        <div
          role="tabpanel"
          id="panel-controls"
          aria-labelledby="tab-controls"
          className={mobileTab === 'controls' ? 'block md:block' : 'hidden md:block'}
        >
          <div className="rn-export-controls-panel" style={controlsPanelStyle}>
            {/* Row 1 — header: «Назад» (D-26) + «Сборка документа» (15px/600). */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/select')}
                aria-label="Вернуться к списку задач"
                style={backBtnStyle}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                <span>Назад</span>
              </button>
              {/* UI-SPEC: the controls-panel page header is Body 15px/600 — NOT a large H1.
                  DocumentPreview's rendered '# Release Notes' carries the big-type / H1 role on
                  this page, so the utility header is a styled <div> to avoid a duplicate <h1>. */}
              <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Сборка документа</div>
            </div>

            {/* Row 2 — grouping (D-07): caption + GroupingControl segmented radiogroup. */}
            <div>
              <Caption>ГРУППИРОВКА</Caption>
              <GroupingControl value={group} onChange={(m) => setControl({ group: m })} />
            </div>

            {/* Row 3 — sort (D-08): caption + SortControl (select + direction toggle). */}
            <div>
              <Caption>СОРТИРОВКА</Caption>
              <SortControl
                value={sort}
                dir={dir}
                onValueChange={(k) => setControl({ sort: k })}
                onDirChange={(d) => setControl({ dir: d })}
              />
            </div>

            {/* Row 4 — doc header (D-17): caption + DocHeaderInputs (version + native date). */}
            <div>
              <Caption>ШАПКА ДОКУМЕНТА</Caption>
              <DocHeaderInputs
                version={version}
                date={date}
                onVersionChange={(v) => setControl({ version: v })}
                onDateChange={(d) => setControl({ date: d })}
              />
            </div>

            {/* Row 5 — summary (D-41): «Групп: N • Задач: M • С правками: K». Labels --text-muted,
                numbers <strong> --text, bullets literal '•' with 0.5rem horizontal padding. */}
            <div style={summaryLineStyle}>
              <span>
                Групп: <strong style={summaryNumberStyle}>{doc.groups.length}</strong>
              </span>
              <span style={{ padding: '0 0.5rem' }}>•</span>
              <span>
                Задач: <strong style={summaryNumberStyle}>{doc.header.total}</strong>
              </span>
              <span style={{ padding: '0 0.5rem' }}>•</span>
              <span>
                С правками: <strong style={summaryNumberStyle}>{editedCount}</strong>
              </span>
            </div>

            {/* Row 6 — export buttons (desktop only, D-22). Mobile uses the sticky bar below. */}
            <div className="hidden md:flex" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <ExportButton ext="md" icon="text" label="Markdown" onExport={handleExport} />
              <ExportButton ext="txt" icon="text" label="Текст" onExport={handleExport} />
              <ExportButton ext="html" icon="code" label="HTML" onExport={handleExport} />
            </div>
          </div>
        </div>

        {/* D-21 — export-failure error box. Mirrors IssueTable.errorBoxStyle (background
            var(--surface), border 1px solid var(--error), borderRadius 12, padding 1.5rem, color
            var(--error)). Rendered between the two panels so it is visible on either mobile tab. */}
        {exportError !== null && (
          <div role="alert" style={errorBoxStyle}>
            {exportError}
          </div>
        )}

        {/* Preview panel — tabpanel on mobile (Предпросмотр), always visible on desktop. */}
        <div
          role="tabpanel"
          id="panel-preview"
          aria-labelledby="tab-preview"
          className={mobileTab === 'preview' ? 'block md:block' : 'hidden md:block'}
        >
          <DocumentPreview doc={doc} />
        </div>

        {/* Mobile sticky export bar (D-22/D-28, <md). Renders outside the tabs at the page bottom. */}
        <div
          className="md:hidden"
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            padding: '0.5rem 1rem',
            display: 'flex',
            gap: 8,
            marginTop: 16,
          }}
        >
          <ExportButton ext="md" icon="text" label="Markdown" onExport={handleExport} mobile />
          <ExportButton ext="txt" icon="text" label="Текст" onExport={handleExport} mobile />
          <ExportButton ext="html" icon="code" label="HTML" onExport={handleExport} mobile />
        </div>
      </div>
    </div>
  );
}

/**
 * Caption (UI-SPEC Typography — Caption role) — a 13px/600/uppercase/--text-muted section label
 * above each controls-panel row. Matches ValidationFilter / IssueTable.Th caption styling.
 */
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'block',
        marginBottom: 4,
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

/**
 * ExportButton (UI-SPEC #6) — a single secondary export button. FileText icon for Markdown/Текст,
 * FileCode for HTML. aria-label fully describes the format (D-40). Hover/focus flips border+color to
 * --accent via a scoped `.rn-export-btn` rule (inline onMouseEnter/Leave is insufficient for a11y).
 * On mobile (`mobile`) the button grows to fill the sticky bar (flex:1, min-height 44px touch target).
 */
function ExportButton({
  ext,
  icon,
  label,
  onExport,
  mobile = false,
}: {
  ext: 'md' | 'txt' | 'html';
  icon: 'text' | 'code';
  label: string;
  onExport: (ext: 'md' | 'txt' | 'html') => void;
  mobile?: boolean;
}) {
  const ariaLabel = `Экспорт в ${ext === 'md' ? 'Markdown' : ext === 'txt' ? 'текст' : 'HTML'}`;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => onExport(ext)}
      className="rn-export-btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flex: mobile ? 1 : undefined,
        minHeight: mobile ? 44 : undefined,
        padding: '0.5rem 1rem',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: '0.9375rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {icon === 'text' ? (
        <FileText size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
      ) : (
        <FileCode size={16} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
      )}
      <span>{label}</span>
    </button>
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

/**
 * UI-SPEC #2 — sticky controls panel: background var(--surface), border 1px solid var(--border),
 * borderRadius 8, padding 1rem 1.5rem, 16px gap between the six rows. The sticky position toggle
 * (desktop on / mobile off) lives in EXPORT_CSS via a media query.
 */
const controlsPanelStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '1rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  marginBottom: 16,
};

const summaryLineStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const summaryNumberStyle: React.CSSProperties = {
  color: 'var(--text)',
  fontWeight: 600,
};

/**
 * D-21 — export-failure error box. Mirrors IssueTable.errorBoxStyle exactly (background var(--surface),
 * border 1px solid var(--error), borderRadius 12, padding 1.5rem, color var(--error)).
 */
const errorBoxStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--error)',
  borderRadius: 12,
  padding: '1.5rem',
  color: 'var(--error)',
  marginBottom: 16,
};

/**
 * tabBtnStyle — byte-identical to EditPage.tabBtnStyle (selected = accent bg + white text).
 */
function tabBtnStyle(selected: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '0.5rem 1rem',
    border: '1px solid ' + (selected ? 'var(--accent)' : 'var(--border)'),
    background: selected ? 'var(--accent)' : 'transparent',
    color: selected ? '#fff' : 'var(--text-muted)',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  };
}

/**
 * Scoped CSS for the export surface (UI-SPEC #6 + #2):
 * 1. `.rn-export-btn` hover/focus flips border+color to --accent (a11y — inline onMouseEnter/Leave
 *    cannot express :focus-visible).
 * 2. `.rn-export-controls-panel` is sticky ONLY on desktop (md+, min-width:768px); on mobile it is
 *    static so it scrolls naturally inside the «Контролы» tab panel. Inline style can't express a
 *    breakpoint toggle, so a media query is the minimal correct approach.
 */
const EXPORT_CSS = `
.rn-export-btn:hover, .rn-export-btn:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
}
.rn-export-controls-panel { position: static; }
@media (min-width: 768px) {
  .rn-export-controls-panel { position: sticky; top: 64px; z-index: 10; }
}
`;
