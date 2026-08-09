/**
 * Client-side Blob download helper (CONTEXT.md D-21, D-25, D-34).
 *
 * Pure helpers (sanitizeVersion, buildExportFilename, EXPORT_MIME) + a side-effecting downloadFile
 * that performs the standard browser Blob → object URL → hidden anchor → click → revoke sequence.
 * No backend, no files on the server — the document string is assembled client-side (edits live in
 * EditsContext, the backend never sees them) so client-side download is the only correct option.
 *
 * Threat model: the version input (user-controlled) flows into the download filename (T-05-04).
 * sanitizeVersion strips path/file forbidden characters before interpolation so a malicious or
 * careless version string cannot produce a misleading filename. An empty-after-sanitize version
 * falls back to the date, then to today — never an empty or path-traversal-shaped filename.
 */

/** D-34 — characters forbidden in file/path names across operating systems. */
export const VERSION_FORBIDDEN_CHARS = /[\/\\:*?"<>|]/g;

/** D-34 — strip path/file forbidden characters and trim whitespace. */
export function sanitizeVersion(v: string): string {
  return v.replace(VERSION_FORBIDDEN_CHARS, '').trim();
}

/** Current date as YYYY-MM-DD (UTC) — the final filename fallback (D-25). */
function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * buildExportFilename (D-25, D-34): release-notes-{version|date|today}.{ext}.
 *   - sanitizeVersion(version) non-empty → release-notes-{sanitized}.{ext}
 *   - else date non-empty → release-notes-{date}.{ext}
 *   - else → release-notes-{today}.{ext}
 */
export function buildExportFilename(
  version: string,
  date: string,
  ext: 'md' | 'txt' | 'html',
): string {
  const sanitized = sanitizeVersion(version);
  const stem = sanitized !== '' ? sanitized : date.trim() !== '' ? date.trim() : todayYYYYMMDD();
  return `release-notes-${stem}.${ext}`;
}

/** MIME types per export extension (charset=utf-8 so Cyrillic renders correctly in any viewer). */
export const EXPORT_MIME: Record<'md' | 'txt' | 'html', string> = {
  md: 'text/markdown;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
  html: 'text/html;charset=utf-8',
};

/**
 * downloadFile (D-21): Blob → object URL → hidden <a download> → click → revoke.
 *
 * Side-effecting (touches document/URL). Rethrows on failure so ExportPage's handler can surface
 * the export-failure error box (D-21) — the caller wraps it in try/catch.
 */
export function downloadFile(text: string, ext: 'md' | 'txt' | 'html', filename: string): void {
  const blob = new Blob([text], { type: EXPORT_MIME[ext] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
