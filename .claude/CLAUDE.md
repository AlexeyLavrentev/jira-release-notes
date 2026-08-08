<!-- GSD:project-start source:PROJECT.md -->

## Project

**Jira Release Notes**

Веб-приложение для формирования release notes из задач в Jira (Server / Data Center).
Пользователь задаёт критерии отбора (по версии, JQL, датам), приложение вытягивает задачи с
заполненным кастомным полем «release note», подсвечивает задачи с пустым или проблемным полем,
позволяет отредактировать текст заметок и сгруппировать их перед экспортом в Markdown / plain
text / HTML. Рассчитано на внутреннее командное использование через Docker, с прицелом на
открытую публикацию на GitHub, чтобы другие команды могли развернуть его в своём контуре.

**Core Value:** Из закрытых задач Jira с заполненным кастомным полем «release note» — за минуту получить
аккуратный, отредактированный, сгруппированный и отформатированный документ release notes.

### Constraints

- **Tech stack**: TBD — исследовать оптимальный стек для внутреннего Docker-приложения с приятным UI (через research-фазу)
- **Jira integration**: REST API Jira Server / Data Center; авторизация только через Personal Access Token
- **Deployment**: Docker-контейнер; минимум движущихся частей, без БД
- **Network**: Приложение работает внутри корпоративной сети; обращается к Jira через REST API
- **State**: Сессионное, без сохранения состояния — настройки подключения и пресеты в конфиге/env, не в БД
- **Security**: Открытое приложение без аутентификации пользователей в v1 (доверенная внутренняя сеть); PAT хранится в конфиге/env, не отдаётся клиенту без необходимости
- **Open source**: Готовность к публикации на GitHub — чистая структура, документация, конфиги с примерами
- **Custom field**: Поле «release note» должно быть заведено в Jira администратором; приложение поставляет инструкцию по созданию

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 22 LTS | Backend runtime | Single language across stack (JS/TS), first-class Docker support, mature Jira REST clients, simplest dev experience for an internal tool. LTS guarantees stability through 2027. |
| TypeScript | 5.6+ | Type safety | Jira API responses are deeply nested and custom-field-heavy (`customfield_XXXXX`). Types prevent an entire class of field-name bugs. Worth the small setup cost. |
| Fastify | 5.x | HTTP backend framework | Faster and leaner than Express; built-in schema validation; first-class TypeScript; simple plugin model. Ideal for a small backend that mostly proxies Jira + renders exports. |
| React | 19 | Frontend UI | Largest ecosystem, best tooling, mature markdown/editing libraries. Required for shadcn/ui alignment with apple-design principles. |
| Vite | 6.x | Frontend build tool + dev server | Fast HMR, simple config, trivial Docker multi-stage builds. Pairs naturally with React 19. |
| Tailwind CSS | 4.x | Styling | Utility-first, trivial theming/dark-mode via CSS variables. shadcn/ui and apple-design translations both rely on Tailwind tokens. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest | Accessible React component primitives (Dialog, Select, Tabs, etc.) | Foundation for the apple-design-inspired UI. Copy-in components, fully themeable, no runtime dependency lock-in. |
| react-markdown | 9.x | Render markdown preview | Live preview pane — render the edited release notes as users type. Compose with remark/rehype plugins. |
| remark / remark-gfm | 15.x / 4.x | Markdown AST processing | Parse GFM (tables, strikethrough), normalize whitespace, allow custom transforms for grouping headers. |
| marked | 14.x | Markdown → HTML export | HTML export pipeline (lighter than full remark stringification for one-way conversion). |
| lucide-react | latest | Icon set | SF Symbols is Apple-platform-licensed and not legal for web. Lucide is the cleanest open-license geometric alternative that matches the apple-design visual weight. |
| TanStack Query | 5.x | Server state (Jira fetches, caching) | Fetching/searching Jira issues is async, paginated, retry-prone. TanStack Query handles caching, loading/error states, retries declaratively. |
| Zod | 3.x | Runtime config + API response validation | Validate Jira config (URL, PAT, custom field ID) and normalize the messy Jira search response shape. |
| Vitest | 2.x | Unit/integration tests | Vite-native, fast, Jest-compatible API. Test the Jira client and export engines. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Docker (multi-stage build) | Single-image production deploy | Stage 1: build Vite SPA + compile TS backend. Stage 2: copy artifacts into `node:22-alpine`. Final image ~150MB. |
| docker-compose | Local dev orchestration | One `docker compose up` runs the app + hot-reload. Documented in README for open-source users. |
| ESLint + Prettier | Code quality | Flat config; enforces import ordering and consistent formatting. |
| Playwright (optional, later) | E2E tests | Add in a later phase for the full flow: configure → search → edit → preview → export. |

## Installation

# Core

# Frontend

# shadcn/ui (copy-in CLI, not a dependency)

# Dev dependencies

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Fastify | Express | If team has deep Express muscle-memory; Fastify is strictly better for new projects. |
| Fastify | Hono | If deploying to edge/serverless instead of Docker container. Overkill here. |
| React | Svelte/SvelteKit | Smaller bundle, simpler reactivity. But shadcn/ui + apple-design translations are React-first; ecosystem cost outweighs bundle savings for an internal tool. |
| React | Vue/Nuxt | Same reasoning as Svelte — strong ecosystem but less alignment with the design system choice. |
| Node.js | Python (FastAPI) | Valid if team is Python-centric. But single-language TS stack + richer React ecosystem tips it to Node for this UI-heavy tool. |
| Node.js | Go (single binary) | Go produces a single static binary (nicest Docker story), but no React on the backend and a steeper UI integration story. Choose Go only if minimizing image size is the top priority. |
| Tailwind | CSS Modules | More isolation, but harder dark-mode theming. Tailwind's token model maps cleanly to apple-design color semantics. |
| shadcn/ui | Mantine / Chakra | Full installed libraries. shadcn's copy-in model means zero version-lock and full theme control — better for matching apple-design precisely. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| SF Symbols (web) | Apple-licensed for Apple-platform software only; not legal for general web use, even open-source | lucide-react |
| Next.js | Adds SSR/routing complexity unnecessary for a single-page internal tool; Docker build is heavier | Vite SPA + Fastify |
| Heavy WYSIWYG editors (TinyMCE, CKEditor, Froala) | Bloat, licensing (Froala is commercial), wrong fit for editing short release-note text fields | react-markdown preview + native textarea/editor |
| Storing PAT in localStorage / sending to browser | Security: PAT is a bearer credential with full Jira access of its owner | Keep PAT server-side (config/env), backend proxies all Jira calls |
| Basic auth (username+password) to Jira | Project decision: PAT-only in v1 for simplicity and security | PAT with `Authorization: Bearer` header |
| SQLite / any embedded DB | Project decision: session-less, no DB | Stateless backend; config via env/config file |

## Stack Patterns by Variant

- Swap Node/Fastify for Python/FastAPI; keep React+Vite SPA; FastAPI serves the SPA + proxies Jira.
- Otherwise all recommendations hold.
- Consider Go backend (single static binary in `scratch`/`alpine`), keep React SPA served via embedded `embed.FS`.
- Node + Fastify + React + Vite + Tailwind + shadcn/ui. One language, one Docker image, simplest open-source story.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19 | react-markdown 9.x, shadcn/ui (latest), TanStack Query 5.x | React 19 stabilized; all three support it. |
| Vite 6 | React 19 via @vitejs/plugin-react | Use plugin-react, not the legacy plugin. |
| Tailwind 4 | shadcn/ui (latest, post-Tailwind-4 migration) | shadcn migrated to Tailwind 4 token model; older shadcn versions expect Tailwind 3. |
| Node 22 LTS | All listed packages | Avoid Node 18 (EOL April 2025). |

## Sources

- Atlassian Developer — Jira Data Center REST API customfields group: https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-customfields/
- Atlassian Confluence — Using Personal Access Tokens: https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html
- Strapi — 5 Best Markdown Editors for React: https://strapi.io/blog/top-5-markdown-editors-for-react
- uiwjs/react-md-editor: https://github.com/uiwjs/react-md-editor
- Contentful — react-markdown tutorial: https://www.contentful.com/blog/react-markdown/
- Stack Overflow — SF Symbols on the web (licensing): https://stackoverflow.com/questions/64083993/is-there-a-way-to-use-apple-sf-symbols-on-the-web
- devforth — Deploy React/Vue/Svelte in Docker: https://devforth.io/insights/deploy-reactvuesvelte-in-docker-simply-and-efficiently-using-spa-to-http-and-traefik/

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
