/**
 * Public API for the exporter module (CONTEXT.md D-31).
 *
 * The core (group + render) is pure and tested; ExportPage / DocumentPreview consume only what
 * this barrel re-exports. Plan 02 added buildPlain/buildHtml + the download helpers below — they
 * are additive re-exports, no churn for existing consumers.
 */

export {
  buildDocumentDoc,
  groupBy,
  sortGroups,
  resolveNoteText,
  TYPE_GROUP_ORDER,
  NO_COMPONENT_LABEL,
  NO_EPIC_LABEL,
} from './group.js';

export { buildMarkdown, pluralizeTask } from './format-md.js';

export { buildPlain } from './format-plain.js';

export { buildHtml, INLINE_CSS } from './format-html.js';

export {
  sanitizeVersion,
  buildExportFilename,
  downloadFile,
  EXPORT_MIME,
  VERSION_FORBIDDEN_CHARS,
} from './download.js';

export type {
  GroupingMode,
  ExportSortKey,
  DocItem,
  DocGroup,
  DocHeader,
  DocumentDoc,
  MissingItem,
  MissingCategory,
} from './types.js';
