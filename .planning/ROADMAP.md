# Roadmap: Jira Release Notes

## Overview

Build an internal, open-source web tool that turns closed Jira Server/DC issues (with a filled
"release note" custom field) into a clean, editable, grouped, and formatted release-notes
document in under a minute. Each phase delivers one end-to-end verifiable capability; nothing
ships until a user could observe value from it.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-08-10)
- ✅ **v1.1 Smart Filtering** — Phases 8-10 (shipped 2026-08-11)
- ✅ **v1.2 UX Fixes** — Phases 11-12 (shipped 2026-09-24)
- ✅ **v1.3 Component Overrides** — Phases 13-14 (shipped 2026-09-24)
- 📋 **Next milestone** — TBD via `/gsd-new-milestone`

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

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Smart Filtering (Phases 8-10) — SHIPPED 2026-08-11</summary>

**Goal:** Из Jira приходит грязь — на выходе чистый готовый release notes документ без ручной вычитки.

- [x] Phase 8: Status Filtering (2/2 plans) — completed 2026-08-10
- [x] Phase 9: Skip Markers (2/2 plans) — completed 2026-08-10
- [x] Phase 10: Clean Export & Configurable Threshold (2/2 plans) — completed 2026-08-11

Full details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 UX Fixes (Phases 11-12) — SHIPPED 2026-09-24</summary>

**Goal:** Возврат из редактора/экспорта на главную сохраняет настроенные фильтры и результаты; группировка по компонентам кладёт каждую задачу ровно в одну группу.

- [x] Phase 11: Navigation Filter Preservation (2/2 plans: 11-01 навигация + 11-02 SPA-fallback G-11-2) — completed 2026-09-23
- [x] Phase 12: Single-Component Grouping (2/2 plans: 12-01 last-wins + 12-02 same-name fixture G-12-5) — completed 2026-09-23

Full details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3 Component Overrides (Phases 13-14) — SHIPPED 2026-09-24</summary>

**Goal:** Мультикомпонентные задачи видны в таблице с первого взгляда; пользователь может вручную назначить, в какую группу компонентной группировки попадёт такая задача.

- [x] **Phase 13: Multi-Component Highlight** - Маркер в колонке «Компоненты» (desktop-таблица и мобильная карточка) на задачах с 2+ компонентами — видно с первого взгляда, независимо от override (completed 2026-09-24)
- [x] **Phase 14: Component Group Override** - Селектор группы в раскрытой строке задачи (компоненты + «По умолчанию» = last-wins), sessionStorage-персистенция, действует во всех форматах экспорта; инварианты v1.2 (exactly-once) сохраняются (completed 2026-09-24)


Full details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 13 → 14 (Phase 14 полагается на маркер Phase 13 как на аффорданс и на критерий «маркер остаётся при override»)

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
| 9. Skip Markers | v1.1 | 2/2 | Complete | 2026-08-10 |
| 10. Clean Export & Configurable Threshold | v1.1 | 2/2 | Complete | 2026-08-11 |
| 11. Navigation Filter Preservation | v1.2 | 2/2 | Complete | 2026-09-23 |
| 12. Single-Component Grouping | v1.2 | 2/2 | Complete | 2026-09-23 |
| 13. Multi-Component Highlight | v1.3 | 1/1 | Complete    | 2026-09-24 |
| 14. Component Group Override | v1.3 | 2/2 | Complete    | 2026-09-24 |

---
*Roadmap v1.3 created: 2026-09-24 (2 phases, 3/3 v1.3 requirements mapped)*
