# Создание кастомного поля Release Note в Jira

Приложение читает значение release note из кастомного поля Jira по его ID (параметр
`releaseNoteField` в `config.json` или переменная окружения `JIRA_RELEASE_NOTE_FIELD`).
ID поля — это `customfield_XXXXX`, а не его имя.

Этот гайд — **для администратора Jira**: как создать поле правильного типа и как узнать его
`customfield_XXXXX`. Как заполнять поле — см. [docs/writing-release-notes.md](writing-release-notes.md).

## Рекомендуемый тип поля

Рекомендуется **Text Field** (однострочное, plain text).

НЕ используйте:
- **НЕ Textarea** (многострочное поле) — release note это краткая суть изменения, одна-две строки.
  Длинные описания остаются в самом issue.
- **НЕ поле с Jira wiki markup** — приложение читает поле как plain text и рендерит его как
  markdown. Wiki markup останется сырым текстом в выгрузке.

Приложение через `normalizeFieldValue` (см. архитектуру бэкенда) читает `text`, `textarea` и
`select` поля единообразно, нормализуя каждое в plain string — поэтому однострочный Text Field
будет прочитан корректно, но именно он даёт самую чистую семантику «короткая заметка».

> Примечание: в UI приложения (Phase 4 редактор) поле редактируется как textarea (многострочно),
> но это не требует, чтобы поле в Jira было многострочным — редактор правит plain text, который
> сохраняется обратно в Jira field.

## Контекст поля

Рекомендуется **глобальный контекст** (все проекты).

Release notes — проектонезависимая сущность: заметка про изменение относится к самому изменению,
а не к конкретному проекту. Глобальное поле избавляет от настройки в каждом проекте отдельно.

## Шаги создания

1. Войти в Jira под учётной записью **администратора**.
2. Settings (шестерёнка в правом верхнем углу) → **Issues** → **Custom fields**.

   <!-- TODO: screenshot -->

3. Нажать **Add custom field** → раздел **Advanced** → выбрать **Text Field (single line)**.
4. Имя поля: `Release Note` (точное имя важно для discovery-шага ниже — поиск идёт по имени).

   <!-- TODO: screenshot -->

5. Привязать поле к нужным экранам (screens): **Default Issue Screen** плюс проектные экраны, на
   которых инженеры редактируют задачи. Без привязки к экрану поле не появится в интерфейсе
   создания/редактирования issue.

## Как узнать customfield_XXXXX

Приложению нужен числовой ID поля, а не его имя. Универсальный способ получить ID — через REST API
Jira с помощью `curl` + `jq`.

Основная команда (замените `$JIRA_PAT` и `$JIRA_BASE_URL` на ваши значения):

```bash
curl -s -H "Authorization: Bearer $JIRA_PAT" "$JIRA_BASE_URL/rest/api/2/field" \
  | jq '[.[] | select(.name | test("release note"; "i")) | {id, name, schema: .schema.type, custom: .custom}]'
```

Вывод — массив объектов. Пример:

```json
[
  {
    "id": "customfield_10042",
    "name": "Release Note",
    "schema": "string",
    "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textfield"
  }
]
```

Значение поля `id` (`customfield_10042` в примере) — это то, что нужно подставить в
`releaseNoteField`.

Если массив пустой — имя поля отличается. Тогда выведите все кастомные поля и найдите нужный
глазами:

```bash
curl -s -H "Authorization: Bearer $JIRA_PAT" "$JIRA_BASE_URL/rest/api/2/field" \
  | jq '[.[] | select(.custom != null) | {id, name}]'
```

Выберите поле с типом `schema: "string"` (plain text). Поля с типом `any` или
`com.atlassian.*`-объекты (например devstatus summary bean) — **не** подходят: приложение вытащит
из них Java `toString()`-мусор вместо release note.

## Подстановка id в приложение

Подставьте найденный `customfield_XXXXX` одним из способов:

- В `config.json`: `"releaseNoteField": "customfield_10042"`
- Или через переменную окружения: `JIRA_RELEASE_NOTE_FIELD=customfield_10042`

Подробности по остальным параметрам конфигурации — см. раздел **Конфигурация** в [README](../README.md).

## Дальше

Поле создано и его ID известен. Как инженерам заполнять это поле, чтобы release notes были
полезными — см. [docs/writing-release-notes.md](writing-release-notes.md).
