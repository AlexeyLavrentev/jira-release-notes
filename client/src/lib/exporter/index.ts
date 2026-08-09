/**
 * Public API for the exporter module (CONTEXT.md D-31).
 *
 * The core (group + render) is pure and tested; ExportPage / DocumentPreview consume only what
 * this barrel re-exports. Plan 02 will add buildPlain/buildHtml/download — they are NOT
 * pre-declared here (adding them later is additive, no churn for current consumers).
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

export type {
  GroupingMode,
  ExportSortKey,
  DocItem,
  DocGroup,
  DocHeader,
  DocumentDoc,
} from './types.js';
