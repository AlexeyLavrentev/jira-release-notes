import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeVersion,
  buildExportFilename,
  downloadFile,
  EXPORT_MIME,
  VERSION_FORBIDDEN_CHARS,
} from './download.js';

describe('VERSION_FORBIDDEN_CHARS (D-34)', () => {
  it('matches the documented path/file forbidden characters', () => {
    // D-34 lists: / \ : * ? " < > |
    for (const ch of ['/','\\',':','*','?','"','<','>','|']) {
      expect(ch.match(VERSION_FORBIDDEN_CHARS)).not.toBeNull();
    }
    // A clean semantic version does NOT match.
    expect('1.2.3'.match(VERSION_FORBIDDEN_CHARS)).toBeNull();
  });
});

describe('sanitizeVersion (D-34)', () => {
  it.each([
    ['1.2.3', '1.2.3'],
    ['1.2.3/beta', '1.2.3beta'], // path char stripped
    ['a:b*c?', 'abc'], // : * ? removed
    ['v\\1|2', 'v12'], // \ and | removed
    ['ver"sion', 'version'], // " removed
    ['1<2>3', '123'], // < > removed
    ['   ', ''], // whitespace trimmed → empty
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(sanitizeVersion(input)).toBe(expected);
  });
});

describe('buildExportFilename (D-25, D-34 — version → date → today fallback)', () => {
  it('version present → release-notes-{sanitized}.{ext}', () => {
    expect(buildExportFilename('1.2.3', '2026-08-09', 'md')).toBe('release-notes-1.2.3.md');
    expect(buildExportFilename('1.2.3', '2026-08-09', 'html')).toBe('release-notes-1.2.3.html');
    expect(buildExportFilename('1.2.3', '2026-08-09', 'txt')).toBe('release-notes-1.2.3.txt');
  });

  it('version with path chars → sanitized before interpolation (no path chars in filename)', () => {
    expect(buildExportFilename('1.2.3/beta', '2026-08-09', 'md')).toBe('release-notes-1.2.3beta.md');
  });

  it('version empty (string) → falls back to the provided date', () => {
    expect(buildExportFilename('', '2026-08-09', 'txt')).toBe('release-notes-2026-08-09.txt');
  });

  it('version empty-after-sanitize (only forbidden chars) → falls back to date', () => {
    expect(buildExportFilename('/\\:*?', '2026-08-09', 'md')).toBe('release-notes-2026-08-09.md');
  });

  it('both version and date empty → falls back to today (current YYYY-MM-DD)', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(buildExportFilename('', '', 'html')).toBe(`release-notes-${today}.html`);
  });
});

describe('EXPORT_MIME', () => {
  it('maps each extension to a charset=utf-8 mime type', () => {
    expect(EXPORT_MIME.md).toBe('text/markdown;charset=utf-8');
    expect(EXPORT_MIME.txt).toBe('text/plain;charset=utf-8');
    expect(EXPORT_MIME.html).toBe('text/html;charset=utf-8');
  });
});

describe('downloadFile (D-21)', () => {
  beforeEach(() => {
    // jsdom does not implement URL.createObjectURL/revokeObjectURL by default.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('creates a Blob with EXPORT_MIME for the ext, builds an <a download>, clicks it, revokes the URL', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    // jsdom supports document.createElement + click on the anchor.
    const removeSpy = vi.spyOn(Element.prototype, 'remove');

    downloadFile('hello', 'md', 'release-notes-1.2.3.md');

    expect(createSpy).toHaveBeenCalledTimes(1);
    // The blob was created with the right mime type.
    expect(createSpy.mock.calls[0][0]).toBeInstanceOf(Blob);
    const blob = createSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe(EXPORT_MIME.md);

    // An <a download="..."> was appended, clicked, then removed.
    expect(removeSpy).toHaveBeenCalled();

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock');
    removeSpy.mockRestore();
  });

  it('rethrows so the caller (ExportPage handler) can surface the error box', () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => downloadFile('x', 'txt', 'a.txt')).toThrow('boom');
  });
});
