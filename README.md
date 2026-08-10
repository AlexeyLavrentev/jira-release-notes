# Jira Release Notes

![Node](https://img.shields.io/badge/Node-22-green) ![License](https://img.shields.io/badge/License-MIT-blue)

`jira-release-notes` — веб-приложение для формирования release notes из задач в Jira Server / Data Center.
Из закрытых задач с заполненным кастомным полем «release note» — за минуту получить аккуратный,
отредактированный, сгруппированный и отформатированный документ release notes (Markdown / plain text / HTML).

Рассчитано на внутренние команды, использующие self-hosted Jira Server/DC. Развёртывается как
Docker-контейнер внутри корпоративного контура; никаких баз данных и очередей — только Jira REST API
и PAT.

## Возможности

- **Гибридный отбор задач** — по Fix Version, произвольным JQL или по диапазону дат закрытия.
- **Список задач с валидацией** — подсветка задач с пустым, слишком коротким (<15 символов) или
  плейсхолдерным (вроде «bugfix» / «фикс») полем release note. Предупреждённые задачи не
  исключаются — их можно поправить перед экспортом.
- **Редактор с live preview** — правка текста заметки каждой задачи, с мгновенным предпросмотром
  рендера markdown. Правки сохраняются в `sessionStorage` и защищены предупреждением перед
  закрытием вкладки.
- **Группировка** — по типу задачи / компоненту / эпику / плоский список.
- **Сортировка** — по приоритету, дате закрытия, ключу.
- **Экспорт** — Markdown, plain text, HTML (санитизированный от XSS).
- **UI** — аккуратный apple-design, ручная и системная тёмная тема, иконки lucide.

## Скриншоты

<!-- TODO: screenshot -->

> Скриншоты (список задач, редактор+предпросмотр, экран экспорта) будут добавлены перед публичной публикацией.

## Быстрый старт

```bash
cp config.example.json config.json
# Заполните в config.json: jiraBaseUrl, jiraPat, releaseNoteField
docker compose up -d
```

Приложение поднимется на порту 3000: http://localhost:3000

Альтернатива — переменные окружения через `.env` (см. `.env.example`). Переменная окружения
перекрывает значение в `config.json` (см. [Конфигурация](#конфигурация)).

## Конфигурация

Приложение читает плоский `config.json` в корне проекта. Каждое поле можно также задать
переменной окружения (env > config.json).

| Ключ | Тип | Обязательный | По умолчанию | Описание |
|------|-----|--------------|--------------|----------|
| `jiraBaseUrl` | string (URL) | да | — | Базовый URL Jira Server/DC (например `https://jira.example.com`) |
| `jiraPat` | string | да | — | Personal Access Token пользователя Jira (передаётся только в бэкенд, никогда не уходит в браузер) |
| `releaseNoteField` | string | да | — | ID кастомного поля release note в формате `customfield_XXXXX` (см. [docs/jira-field-setup.md](docs/jira-field-setup.md)) |
| `port` | number | нет | `3000` | Порт, на котором бэкенд слушает HTTP |
| `logLevel` | string | нет | `info` | Уровень логирования (`error`/`warn`/`info`/`debug`) |
| `requestTimeoutMs` | number | нет | `30000` | Таймаут запросов к Jira в миллисекундах |

Переменные окружения (см. `.env.example`):

```
JIRA_BASE_URL
JIRA_PAT
JIRA_RELEASE_NOTE_FIELD
PORT
LOG_LEVEL
REQUEST_TIMEOUT_MS
```

**Приоритет:** переменная окружения перекрывает значение в `config.json` (env > config.json).

## Деплой

### Docker run

```bash
docker run -d -p 3000:3000 \
  -v "$PWD/config.json":/app/config.json:ro \
  --name jira-release-notes \
  jira-release-notes
```

### docker-compose

Рекомендуемый способ для локального и боевого развёртывания. В комплекте идёт
[`docker-compose.yml`](docker-compose.yml) — он монтирует `config.json` только для чтения и
прокидывает переменные из `.env`:

```bash
docker compose up -d
```

### HTTPS и корпоративные сертификаты

Само приложение работает по HTTP — для TLS поставьте его за reverse proxy (nginx, Caddy, Traefik).

Если Jira использует самоподписанный или корпоративный CA-сертификат, задайте переменную
`NODE_EXTRA_CA_CERTS` путём к bundle CA внутри контейнера (через `environment` в compose или `-e`
при `docker run`). Без этого запросы к Jira упадут с TLS-ошибкой.

PAT требует **Jira Server/DC 8.14+** (см. [Troubleshooting](#troubleshooting)).

## Гайды

- **[docs/jira-field-setup.md](docs/jira-field-setup.md)** — для Jira-администраторов: как завести
  поле Release Note и узнать его `customfield_XXXXX`.
- **[docs/writing-release-notes.md](docs/writing-release-notes.md)** — для исполнителей: как
  заполнять поле, чтобы release notes были полезными.

## Troubleshooting

- **PAT требует Jira 8.14+** — Personal Access Token появился в Jira 8.14. На младших версиях
  приложение сообщит об ошибке проверки версии. Обновите Jira либо используйте другой метод
  авторизации (вне scope v1).
- **Ошибки соединения с Jira** — проверьте `jiraBaseUrl`, сетевую доступность Jira из контейнера
  и таймаут `requestTimeoutMs`. Для self-signed/корпоративных сертификатов задайте
  `NODE_EXTRA_CA_CERTS`.
- **Пустой список задач** — проверьте критерии отбора (JQL / Fix Version / диапазон дат) и
  убедитесь, что задачи действительно закрыты.
- **Неверный `releaseNoteField`** — приложение читает поле по ID. Если ID неправильный, заметки
  будут пустыми. Как узнать верный ID — см. [docs/jira-field-setup.md](docs/jira-field-setup.md),
  раздел discovery через curl + jq.
- **Корпоративные TLS-сертификаты** — задайте `NODE_EXTRA_CA_CERTS` путём к CA bundle.

## Разработка

- **Node 22 LTS**, пакетный менеджер npm.
- Установка зависимостей: `npm ci`
- Dev-сервер: `npm run dev` (конкурентно Vite :5173 с HMR и Fastify :3000). UI — на
  http://localhost:5173 (проксирует `/api` и `/health` на :3000).
- Тесты: `npm test` (vitest).
- Линт: `npm run lint` (eslint).
- Сборка: `npm run build`.

Структура репозитория:

```
server/   Fastify-бэкенд: Jira REST-прокси, конфиг-лоадер, /health
client/   React SPA (Vite): выбор задач, редактор, экспорт
shared/   Общие TypeScript-типы
Dockerfile, docker-compose.yml   Развёртывание
```

> Директория `.planning/` (артефакты GSD-воркфлоу) находится в `.gitignore` — в репозиторий
> попадает только `.planning/PROJECT.md`.

## Лицензия

MIT. См. [LICENSE](LICENSE).

Copyright (c) 2026 Aleksey
