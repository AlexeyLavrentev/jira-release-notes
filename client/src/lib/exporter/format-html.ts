import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { DocumentDoc } from './types.js';
import { buildMarkdown } from './format-md.js';

/**
 * HTML renderer (CONTEXT.md D-24, EXP-03, threat T-05-03).
 *
 * Pure (async): takes a DocumentDoc, returns a STANDALONE `<!DOCTYPE html>` document string whose
 * body is the markdown-rendered document, sanitized against XSS with rehype-sanitize's
 * defaultSchema — the SAME schema react-markdown applies in DocumentPreview/Preview.tsx (XSS parity,
 * D-32 / Phase 4 D-08). The exported file is a single self-contained .html with inline CSS so it
 * reads in any browser with no external dependencies (D-24).
 *
 * Threat model (T-05-03): untrusted release-note text becomes a file the user opens in a browser.
 * rehype-sanitize is the sole XSS gate. The pipeline mirrors DocumentPreview byte-for-byte:
 * remarkParse → remarkGfm → remarkRehype → rehypeSanitize(defaultSchema) → rehypeStringify.
 * rehype-raw is deliberately NOT imported — adding it would parse embedded HTML and require stricter
 * schema surgery.
 *
 * D-32: this reuses buildMarkdown (no re-grouping) — adding an HTML format touched zero grouping
 * code, proving the architecture's "add a format" promise.
 */

/**
 * Inline CSS for the standalone HTML document. Exported files are theme-less (no CSS vars, no app
 * shell) so the LIGHT token values from client/src/index.css are hardcoded (D-24). These track the
 * UI-SPEC DocumentPreview typography so the exported .html is WYSIWYG with the live preview (D-16).
 */
export const INLINE_CSS = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  color: #1d1d1f;
  background: #ffffff;
  line-height: 1.6;
}
h1 { font-size: 28px; font-weight: 600; line-height: 1.2; margin: 0 0 0.5rem; }
h2 { font-size: 20px; font-weight: 600; line-height: 1.3; margin: 1rem 0 0.5rem; border-bottom: 1px solid #d2d2d7; padding-bottom: 0.25rem; }
p, li { font-size: 15px; font-weight: 400; line-height: 1.6; }
ul { padding-left: 1.25rem; }
ul li { margin-bottom: 0.25rem; }
a { color: #0071e3; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f5f5f7; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; }
hr { border: none; border-top: 1px solid #d2d2d7; margin: 1rem 0; }
table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
th, td { border: 1px solid #d2d2d7; padding: 0.25rem 0.5rem; }
blockquote { border-left: 3px solid #d2d2d7; margin: 0.5rem 0; padding-left: 1rem; color: #6e6e73; }
`.trim();

/**
 * Render the DocumentDoc's markdown to sanitized HTML body via the unified one-shot pipeline.
 * Mirrors DocumentPreview/Preview.tsx plugin composition (XSS parity).
 */
async function renderBodyHtml(doc: DocumentDoc): Promise<string> {
  const markdown = buildMarkdown(doc);
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, defaultSchema)
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}

/**
 * buildHtml — render the whole DocumentDoc as a standalone sanitized HTML document (D-24, EXP-03).
 *
 * Async because the unified `process` is async. Wraps the sanitized body in a complete HTML document
 * with a hardcoded light-theme `<style>` block.
 */
export async function buildHtml(doc: DocumentDoc): Promise<string> {
  const body = await renderBodyHtml(doc);
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="ru">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>Release Notes</title>\n' +
    `<style>\n${INLINE_CSS}\n</style>\n` +
    '</head>\n' +
    `<body>\n${body}\n</body>\n` +
    '</html>\n'
  );
}
