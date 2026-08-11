import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { buildMarkdown } from '../lib/exporter/index.js';
import type { DocumentDoc } from '../lib/exporter/index.js';

/**
 * DocumentPreview (Phase 5, D-15/D-16/D-30) — renders the WHOLE assembled document.
 *
 * Receives an already-built DocumentDoc and derives the markdown string internally via buildMarkdown
 * (D-16 — useMemo, synchronous). It does NOT take a raw markdown prop: keeping the single WYSIWYG
 * source derived from the doc makes the preview/export invariants obvious and testable.
 *
 * XSS defense in depth (parity with Phase 4 Preview.tsx XSS-1): react-markdown v9 ignores raw HTML
 * by default (renders it as text), AND rehype-sanitize with defaultSchema strips any dangerous
 * tags/attributes even if raw HTML were introduced later. rehype-raw is deliberately NOT imported —
 * adding it would parse embedded HTML and require stricter schema surgery. The plugin composition is
 * byte-identical to Preview.tsx so XSS behavior matches across the single-note and whole-document views.
 *
 * The preview matches the export (WYSIWYG — D-16/D-18). Phase 10: invalid notes (empty/short/
 * placeholder) no longer carry in-body markers; they render in a trailing «Нет release note» section
 * (buildMarkdown emits it from doc.missingNotes), shown identically here and in the export files.
 */
export function DocumentPreview({ doc }: { doc: DocumentDoc }) {
  const markdown = useMemo(() => buildMarkdown(doc), [doc]);
  return (
    <div
      role="region"
      aria-label="Предпросмотр документа"
      aria-live="polite"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
        color: 'var(--text)',
      }}
    >
      <style>{DOC_PREVIEW_TYPOGRAPHY}</style>
      <div className="rn-doc-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, defaultSchema]]}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/**
 * Scoped typography for the rendered document under `.rn-doc-preview` (UI-SPEC ## Typography).
 * Inline-style idiom doesn't cover nested markdown elements (hr, table, code, blockquote), so a
 * single scoped <style> block is the pragmatic minimal approach — mirrors EditPage's
 * MARKDOWN_TYPOGRAPHY pattern. h1/h2/li/hr rules track the WYSIWYG export contract.
 */
const DOC_PREVIEW_TYPOGRAPHY = `
.rn-doc-preview h1 { font-size: 28px; font-weight: 600; line-height: 1.2; margin: 0 0 0.5rem; }
.rn-doc-preview h2 { font-size: 20px; font-weight: 600; line-height: 1.3; margin: 1rem 0 0.5rem; }
.rn-doc-preview p, .rn-doc-preview li { font-size: 15px; font-weight: 400; line-height: 1.6; }
.rn-doc-preview hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
.rn-doc-preview ul { padding-left: 1.25rem; }
.rn-doc-preview ul li { margin-bottom: 0.25rem; }
.rn-doc-preview code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--bg); padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; }
.rn-doc-preview a { color: var(--accent); }
.rn-doc-preview table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
.rn-doc-preview th, .rn-doc-preview td { border: 1px solid var(--border); padding: 0.25rem 0.5rem; }
.rn-doc-preview blockquote { border-left: 3px solid var(--border); margin: 0.5rem 0; padding-left: 1rem; color: var(--text-muted); }
`;
