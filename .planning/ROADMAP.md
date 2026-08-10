# Roadmap: Jira Release Notes

## Overview

Build an internal, open-source web tool that turns closed Jira Server/DC issues (with a filled
"release note" custom field) into a clean, editable, grouped, and formatted release-notes
document in under a minute. Each phase delivers one end-to-end verifiable capability; nothing
ships until a user could observe value from it.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-08-10)
- 🚧 **v1.1 Smart Filtering** — Phases 8-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-08-10</summary>

- [x] Phase 1: Project Scaffold & Jira Connection (3/3 plans) — completed 2026-08-08
- [x] Phase 2: Jira Proxy & Search (3/3 plans) — completed 2026-08-08
- [x] Phase 3: Issue List & Validation (3/3 plans) — completed 2026-08-09
- [x] Phase 4: Editor & Live Preview (4/4 plans) — completed 2026-08-09
- [x] Phase 5: Grouping, Sort & Export (4/4 plans) — completed 2026-08-10
- [x] Phase 6: UI Polish — apple-design & Dark Mode (5/5 plans) — completed 2026-08-10
- [x] Phase 7: Guide, README & Open-Source Prep (3/3 plans) — completed 2026-08-10

</details>

### 🚧 v1.1 Smart Filtering (In Progress)

**Milestone Goal:** Из Jira приходит грязь — на выходе чистый готовый release notes документ без ручной вычитки.

**Phase Numbering:**

- Integer phases (8, 9, 10): Planned milestone work (continues from v1.0)
- Decimal phases (8.1, 9.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 8: Status Filtering** - Only closed issues by default, with a toggle to include all statuses (completed 2026-08-10)
- [ ] **Phase 9: Skip Markers** - Tasks marked `<no-release-notes>` excluded from the document but visible in selection
- [ ] **Phase 10: Clean Export & Configurable Threshold** - Invalid notes separated into a follow-up list; short threshold configurable

## Phase Details

### Phase 8: Status Filtering

**Goal**: Users get only closed issues by default and can deliberately broaden the search to all statuses
**Depends on**: Phase 7 (v1.0 complete — SearchForm and JQL builder exist)
**Requirements**: FILT-01, FILT-02, FILT-03
**Success Criteria** (what must be TRUE):

  1. By default, every search mode (Fix Version / JQL / dateRange) returns only closed issues (`statusCategory = Done`)
  2. User can toggle between «Только закрытые» and «Все статусы» in SearchForm, and the results update accordingly
  3. In JQL mode, user can choose to apply or skip the status filter on their custom query (filter is not forced onto user-supplied JQL unless requested)

Plans:

- [x] 08-01-PLAN.md
- [x] 08-02-PLAN.md

2/2 plans executed, verified, UAT passed 2026-08-10

1/2 plans executed

- [x] 08-02-PLAN.md — Frontend «Только закрытые» toggle in SearchForm + URL sync in SelectPage/ExportPage (FILT-01 frontend, FILT-02)

**UI hint**: yes

### Phase 9: Skip Markers

**Goal**: Tasks an author explicitly marks as no-release-notes are removed from the document while remaining visible in selection
**Depends on**: Phase 8
**Requirements**: SKIP-01, SKIP-02
**Success Criteria** (what must be TRUE):

  1. A task whose release note contains the `<no-release-notes>` marker (or a recognised alias) is fully excluded from the generated document
  2. Skip tasks show up in the selection table as grayed-out, disabled rows with a skip icon, so the user can see they were intentionally dropped
  3. Skip tasks never enter the editor or any export output

Plans:

- [ ] 09-01-PLAN.md — SKIP-01 data-flow backbone: 'skip' category + marker detection + export exclusion + type-system collateral (validation.ts, group.ts, IssueRow/MobileIssueCard, new validation.test.ts)
- [ ] 09-02-PLAN.md — SKIP-02 selection visibility: «Пропущенные» filter segment + counter, grayed/struck-through skip rows (desktop + mobile), read-only EditPage rendering, writing-guide marker docs

**UI hint**: yes

### Phase 10: Clean Export & Configurable Threshold

**Goal**: The exported document contains only valid release notes, with invalid tasks surfaced separately for follow-up, and the "short" threshold tunable per deployment
**Depends on**: Phase 9
**Requirements**: EXPORT-01, EXPORT-02, CONF-01
**Success Criteria** (what must be TRUE):

  1. Empty, placeholder, and short release notes do not appear in the document body (no `[ПУСТО]` / `[ЗАГЛУШКА]` / `[КОРОТКО]` markers leak into output)
  2. Invalid tasks (empty / placeholder / short) appear in a separate «Нет release note» list with their issue keys, so an author knows exactly what to fill in
  3. The short-release-note threshold is configurable via `config.json` (`shortThreshold`, default 15) and a changed value takes effect on the next search/validate cycle

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Project Scaffold & Jira Connection | v1.0 | 3/3 | Complete | 2026-08-08 |
| 2. Jira Proxy & Search | v1.0 | 3/3 | Complete | 2026-08-08 |
| 3. Issue List & Validation | v1.0 | 3/3 | Complete | 2026-08-09 |
| 4. Editor & Live Preview | v1.0 | 4/4 | Complete | 2026-08-09 |
| 5. Grouping, Sort & Export | v1.0 | 4/4 | Complete | 2026-08-10 |
| 6. UI Polish — apple-design & Dark Mode | v1.0 | 5/5 | Complete | 2026-08-10 |
| 7. Guide, README & Open-Source Prep | v1.0 | 3/3 | Complete | 2026-08-10 |
| 8. Status Filtering | v1.1 | 2/2 | Complete | 2026-08-10 |
| 9. Skip Markers | v1.1 | 0/2 | Not started | - |
| 10. Clean Export & Configurable Threshold | v1.1 | 0/TBD | Not started | - |
