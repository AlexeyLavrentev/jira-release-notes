import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronUp, ChevronDown, Ban } from 'lucide-react';
import { searchQueryKey } from '../hooks/useSearch.js';
import { useEdits } from '../context/EditsContext.js';
import { useValidation } from '../context/ValidationContext.js';
import { SKIP_MARKER } from '../lib/validation.js';
import { Preview } from '../components/Preview.js';
import { StateView } from '../components/StateView.js';
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
  body.closedOnly = searchParams.get('closedOnly') !== '0';
  return body;
}

export function EditPage() {
  const { key } = useParams<{ key: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { edits, setEdit, resetEdit } = useEdits();
  // Phase 10 D-08 — validation from the shared factory via context (configured threshold).
  const v = useValidation();

  const searchBody = rebuildSearchBody(searchParams);
  const data = searchBody ? queryClient.getQueryData<SearchResponse>(searchQueryKey(searchBody)) : undefined;
  const issue = key ? (data?.issues.find((i) => i.key === key) ?? null) : null;

  // ↑↓ navigation through the search-result key list (D-04). disabled at each list end.
  const keys = data?.issues.map((i) => i.key) ?? [];
  const currentIndex = key ? keys.indexOf(key) : -1;
  const prevKey = currentIndex > 0 ? keys[currentIndex - 1] : null;
  const nextKey = currentIndex >= 0 && currentIndex < keys.length - 1 ? keys[currentIndex + 1] : null;

  const [text, setText] = useState(() => (key ? (edits[key] ?? issue?.releaseNote ?? '') : ''));
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit'); // D-22 default 'edit'
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reactive to :key change (↑↓ nav changes params without remount) — textarea + preview update,
  // and focus follows the active task (D-23).
  useEffect(() => {
    setText(key ? (edits[key] ?? issue?.releaseNote ?? '') : '');
    textareaRef.current?.focus();
    // edits + issue intentionally re-derived each key change
  }, [key]);

  // D-13/D-18 — skip status is derived from the SAME edits-priority resolution the rest of the
  // page uses (edits[key] ?? issue.releaseNote). If the engineer removed the marker and wrote real
  // text, validateReleaseNote returns non-skip → isSkip is false → the normal editable textarea
  // renders (D-18 reactivation). Only a field that IS the marker (or an edit equal to it) is skip.
  const resolvedText = key ? (edits[key] ?? issue?.releaseNote ?? '') : '';
  const isSkip = v.validateReleaseNote(resolvedText) === 'skip';

  // Esc = back to /select (D-23). window listener catches Esc even while the textarea is focused.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/select');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    // D-13 — a skip issue cannot be edited. Defense-in-depth: the textarea is not even rendered
    // for skip (see the edit panel conditional below), but the guard keeps the write path airtight.
    if (isSkip) return;
    const next = e.target.value;
    setText(next);
    if (key) setEdit(key, next);
  }

  const isEdited = key ? Object.prototype.hasOwnProperty.call(edits, key) : false;

  function handleReset() {
    if (!key) return;
    resetEdit(key);
    setText(issue?.releaseNote ?? '');
  }

  // D-05: direct URL or stale cache → empty state, no crash. D-13: uses the shared StateView.
  // Copy preserved verbatim — EditPage.test.tsx asserts "Откройте задачу из списка поиска" + "К списку".
  const emptyState = (!data && !issue) || (data && !issue);
  if (emptyState) {
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
          heading="Откройте задачу из списка поиска"
          cta={
            <button onClick={() => navigate('/select')} style={doneBtnStyle}>
              К списку
            </button>
          }
        />
      </div>
    );
  }

  return (
    // D-14 — responsive horizontal padding via Tailwind on the outer wrapper; the inner
    // maxWidth container keeps vertical padding only (var(--space-5) 0).
    <div className="px-4 md:px-6" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <style>{MARKDOWN_TYPOGRAPHY}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'var(--space-5) 0' }}>
        <header style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{issue!.key}</code>
              {isEdited && (
                <span aria-label="Отредактировано" title="Отредактировано" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  •
                </span>
              )}
            </div>
            <h1 style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 600 }}>{issue!.summary}</h1>
          </div>
          {/* ↑↓ navigation (D-04). disabled at list ends. */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => prevKey && navigate(`/edit/${prevKey}`)}
              disabled={!prevKey}
              aria-label="Предыдущая задача"
              style={navBtnStyle(!prevKey)}
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={() => nextKey && navigate(`/edit/${nextKey}`)}
              disabled={!nextKey}
              aria-label="Следующая задача"
              style={navBtnStyle(!nextKey)}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </header>

        {/* Mobile tabs (D-22, <md): Правки | Предпросмотр, default 'edit'. Desktop split below. */}
        <div
          role="tablist"
          aria-label="Режим редактора"
          className="md:hidden"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              setMobileTab((t) => (t === 'edit' ? 'preview' : 'edit'));
              const target = e.key === 'ArrowRight' ? 'tab-preview' : 'tab-edit';
              document.getElementById(target)?.focus();
            }
          }}
          style={{ display: 'flex', gap: 8, marginBottom: 16 }}
        >
          <button
            role="tab"
            id="tab-edit"
            aria-selected={mobileTab === 'edit'}
            aria-controls="panel-edit"
            onClick={() => setMobileTab('edit')}
            style={tabBtnStyle(mobileTab === 'edit')}
          >
            Правки
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

        {/* Desktop (md+): split — meta+textarea left, sticky preview right (D-03).
            Mobile (<md): tab panels — only the active one visible (D-22). */}
        <div className="md:grid md:grid-cols-2 md:gap-6">
          {/* Edit panel: visible on mobile only when 'edit' tab active; always on desktop. */}
          <div
            role="tabpanel"
            id="panel-edit"
            aria-labelledby="tab-edit"
            className={mobileTab === 'edit' ? 'block md:block' : 'hidden md:block'}
          >
            {isSkip ? (
              // D-13/D-14 — read-only display block for skip issues. NO textarea (the engineer
              // cannot edit it). Summary + the marker as display text, opacity 0.5 + strikethrough
              // + Ban icon, reusing the resetBtnDisabledStyle opacity idiom for the disabled look.
              <div style={{ padding: '1rem 1.25rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', opacity: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ban size={18} color="var(--text-tertiary)" aria-label="Пропущено (маркер <no-release-notes>)" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Задача пропущена из release notes
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    color: 'var(--text-muted)',
                    textDecoration: 'line-through',
                  }}
                >
                  {SKIP_MARKER}
                </p>
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>
                  Чтобы вернуть задачу в документ — очистите поле в Jira и впишите release note, либо
                  удалите маркер и введите текст.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="release-note-editor" style={{ display: 'block', marginBottom: 8 }}>
                  Release note для {key}
                </label>
                <textarea
                  ref={textareaRef}
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
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', margin: '4px 0 16px' }}>
                  {text.length} символов
                </p>
              </>
            )}
          </div>

          {/* Preview panel: visible on mobile only when 'preview' tab active; always on desktop. */}
          <div
            role="tabpanel"
            id="panel-preview"
            aria-labelledby="tab-preview"
            className={mobileTab === 'preview' ? 'block md:block' : 'hidden md:block'}
          >
            <div
              style={{
                position: 'sticky',
                top: 80,
                maxHeight: 'calc(100vh - 100px)',
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <Preview text={text} />
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', margin: '0 0 8px' }}>
          Правки сохраняются автоматически в этой вкладке
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: 8 }}>
          <button
            onClick={handleReset}
            disabled={!isEdited}
            aria-label="Сбросить к оригиналу"
            style={isEdited ? resetBtnStyle : resetBtnDisabledStyle}
          >
            Сбросить
          </button>
          <button onClick={() => navigate('/select')} style={doneBtnStyle}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Scoped typography for rendered markdown inside Preview. Inline-style idiom doesn't cover
 * nested elements (table cells, blockquotes, code), so a single global <style> block is the
 * pragmatic minimal approach — selectors are markdown-output-specific (rn-preview-*).
 */
const MARKDOWN_TYPOGRAPHY = `
.rn-preview h1, .rn-preview h2, .rn-preview h3 { margin: 1rem 0 0.5rem; }
.rn-preview table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
.rn-preview th, .rn-preview td { border: 1px solid var(--border); padding: 0.25rem 0.5rem; }
.rn-preview code { font-family: ui-monospace, monospace; background: var(--bg); padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; }
.rn-preview blockquote { border-left: 3px solid var(--border); margin: 0.5rem 0; padding-left: 1rem; color: var(--text-muted); }
.rn-preview a { color: var(--accent); }
.rn-preview input[type=checkbox] { margin-right: 0.25rem; }
`;

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

const resetBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontWeight: 500,
  fontSize: '0.9375rem',
  cursor: 'pointer',
};

const resetBtnDisabledStyle: React.CSSProperties = {
  ...resetBtnStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

function navBtnStyle(disabled: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    borderRadius: 8,
    cursor: 'pointer',
  };
  if (disabled) {
    return { ...base, color: 'var(--text-muted)', opacity: 0.4, cursor: 'not-allowed' };
  }
  return { ...base, color: 'var(--text)' };
}

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
