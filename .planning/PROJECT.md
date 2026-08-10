# Jira Release Notes

## What This Is

Веб-приложение для формирования release notes из задач в Jira (Server / Data Center).
Пользователь задаёт критерии отбора (по версии, JQL, датам), приложение вытягивает задачи с
заполненным кастомным полем «release note», подсвечивает задачи с пустым или проблемным полем,
позволяет отредактировать текст заметок и сгруппировать их перед экспортом в Markdown / plain
text / HTML. Рассчитано на внутреннее командное использование через Docker, с прицелом на
открытую публикацию на GitHub, чтобы другие команды могли развернуть его в своём контуре.

## Core Value

Из закрытых задач Jira с заполненным кастомным полем «release note» — за минуту получить
аккуратный, отредактированный, сгруппированный и отформатированный документ release notes.

## Current State

**Shipped v1.0 MVP** (2026-08-10): 7 фаз, 25 планов, ~9 700 LOC TypeScript/React, 56 коммитов за 3 дня.
Стек: Fastify + React + Vite + Tailwind + Docker. Полный select → validate → edit → export loop работает.
Готов к open-source публикации (LICENSE MIT, README, guides, example config).

## Next Milestone Goals

v1.1+ не определён. Кандидаты из v2 Requirements (REQUIREMENTS archive): Jira Cloud support,
saved connection presets, configurable export templates, CSV export, user auth (если выносить
за пределы доверенной сети). Решение — через `/gsd-new-milestone`.

## Requirements

### Validated

- ✓ Подключение к Jira Server / Data Center по Personal Access Token — v1.0 (CONN-01/02/03)
- ✓ Многоэтапная Docker-сборка, один образ — v1.0 (DEPLOY-01)
- ✓ Открытое приложение без аутентификации в v1 — v1.0 (DEPLOY-03)
- ✓ Чтение кастомного поля «release note» по настраиваемому ID с нормализацией — v1.0 (FIELD-01/02/03)
- ✓ Отбор задач по Fix Version / JQL / диапазону дат — v1.0 (SEL-01..05)
- ✓ Валидация и подсветка пустых и плейсхолдерных release notes — v1.0 (VALID-01/02/03)
- ✓ Редактирование release note + live preview + sessionStorage-персистенция — v1.0 (EDIT-01..04)
- ✓ Группировка (тип/компонент/эпик/плоский) + сортировка — v1.0 (GROUP-01..06)
- ✓ Экспорт в Markdown / plain text / HTML с XSS-санитизацией — v1.0 (EXP-01..04)
- ✓ apple-design UI + тёмная тема + lucide-react иконки — v1.0 (UI-01/02/03)
- ✓ docker-compose example — v1.0 (DEPLOY-02)
- ✓ Гайд для исполнителей + README + LICENSE/example config — v1.0 (DOC-01/02/03/04)

### Active

_(Все v1 requirements валидированы. Следующий milestone определит новые Active.)_

### Out of Scope

- Jira Cloud — изначально нацеливаемся на Server/DC; Cloud можно добавить позже (см. v2 CONN-04)
- Авторизация пользователей в самом приложении — v1 работает в доверенной внутренней сети (см. v2 SEC-01)
- Сохранение истории релизов и сессий между запусками — без БД, без состояния
- Базовая авторизация (login+password) в Jira — только PAT, для простоты и безопасности
- Многоязычность самого приложения — язык UI один; release notes формируются на языке исполнителя
- Автогенерация текста release note из описания задачи — приложение только читает и редактирует поле, не генерирует

## Context

- **Целевая среда**: корпоративный контур с self-hosted Jira Server / Data Center. Приложение
  поднимается как Docker-контейнер внутри сети; доступ через браузер.
- **Аудитория**: коллеги-разработчики и релиз-инженеры. Готово к публикации на GitHub для
  повторного использования другими командами.
- **Дисциплина в Jira**: ценность приложения зависит от того, как исполнители заполняют
  кастомное поле. Поэтому в проект встроены рекомендации (гайды docs/) и валидация (подсветка
  пустых полей). Без этого приложение вытащит «всё подряд» или пустоты.
- **Философия**: «без заморочек». Простая установка, понятное использование, без инфраструктуры
  (БД, очереди). Чем меньше движущихся частей — тем лучше.
- **Дизайн**: apple-design визуальный язык, design-token система, тёмная тема. lucide-react
  иконки (SF Symbols недоступен по лицензии Apple для web).

## Constraints

- **Tech stack**: Fastify (backend) + React/Vite (frontend) + TypeScript + Tailwind + Docker
- **Jira integration**: REST API Jira Server / Data Center; авторизация только через Personal Access Token (8.14+)
- **Deployment**: Docker-контейнер; multi-stage build (node → alpine runtime); без БД
- **Network**: Приложение работает внутри корпоративной сети; обращается к Jira через REST API
- **State**: Сессионное, без сохранения состояния — настройки подключения и пресеты в конфиге/env, не в БД
- **Security**: Открытое приложение без аутентификации пользователей в v1 (доверенная внутренняя сеть); PAT хранится в конфиге/env, не отдаётся клиенту
- **Open source**: Готово к публикации на GitHub — LICENSE MIT, README, docs/, config.example.json
- **Custom field**: Поле «release note» должно быть заведено в Jira администратором; гайд в docs/jira-field-setup.md

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Только Jira Server/DC в v1 | Целевой контур — self-hosted; Cloud добавляет отдельный API/авторизацию | ✓ Good — v1.0 shipped, Cloud в v2 backlog |
| Авторизация только через PAT | Современный, безопасный, простой способ (Jira 8.14+) | ✓ Good — работает, PAT в бэкенде, браузер не видит |
| Сессионное приложение без БД | «Без заморочек» — минимум инфраструктуры для внутреннего инструмента | ✓ Good — sessionStorage + URL state, без состояния |
| Гайд для исполнителей + валидация | Ценность зависит от дисциплины заполнения поля; одно без другого не работает | ✓ Good — docs/ + VALID flags в UI |
| Docker для развёртывания | Стандарт для внутренних инструментов; лёгкое распространение через open source | ✓ Good — multi-stage build + compose example |
| Гибридный отбор задач | Разные команды отбирают по-разному (версия / JQL / даты) | ✓ Good — 3 режима отбора в SearchForm |
| Стек: Fastify + React + Vite + Tailwind | Выбран через research: минимальный footprint, быстрый dev loop, SPA-friendly | ✓ Good — 3 дня на весь MVP, 0 blockers от стека |
| apple-design токены вместо UI-библиотеки | Полный контроль над визуальным языком; Tailwind + CSS custom properties | ✓ Good — 17 токенов, cohesive UI, dark mode |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-10 after v1.0 milestone completion (all 7 phases shipped)*
