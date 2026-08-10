import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

/**
 * Preview (Phase 4, D-07/D-08/D-12/D-23) — renders a SINGLE note as markdown→HTML.
 *
 * XSS defense in depth (XSS-1): react-markdown v9 ignores raw HTML by default (renders it as
 * text), AND rehype-sanitize with defaultSchema strips any dangerous tags/attributes even if raw
 * HTML were introduced later. rehype-raw is deliberately NOT imported — adding it would parse
 * embedded HTML and require stricter schema surgery.
 *
 * This component renders ONLY the current note (single `text` prop). Grouping / full-document
 * view is Phase 5 — the caller (EditPage) passes exactly one task's text.
 */
export function Preview({ text }: { text: string }) {
  if (text.trim() === '') {
    return (
      <div style={{ color: 'var(--text-muted)', padding: 'var(--space-6)', textAlign: 'center' }}>
        Заметка пуста — заполните поле выше
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Предпросмотр"
      aria-live="polite"
      className="rn-preview"
      style={{ padding: 'var(--space-4)', color: 'var(--text)', lineHeight: 1.6 }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, defaultSchema]]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
