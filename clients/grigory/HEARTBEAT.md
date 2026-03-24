# HEARTBEAT.md

# Периодические проверки и задачи

## 🚨 КРИТИЧЕСКОЕ ПРАВИЛО — Каждый Heartbeat

**ПРИ КАЖДОМ HEARTBEAT POLL:**

1. **ОБЯЗАТЕЛЬНО** читай `memory/heartbeat-state.json`
2. **ПРОВЕРЯЙ** все `remindLater` timestamps:
   ```javascript
   tasks.forEach(task => {
     if (task.remindLater && task.remindAfter < Date.now()) {
       // НАПОМНИТЬ ПОЛЬЗОВАТЕЛЮ!
     }
   })
   ```
3. **ПРОВЕРЯЙ** все `projects[].next_checkpoint`:
   ```javascript
   projects.forEach(project => {
     if (project.next_checkpoint && new Date(project.next_checkpoint) < new Date()) {
       // CHECKPOINT ПРОПУЩЕН → НАПОМНИТЬ OWNER'У!
     }
   })
   ```
5. **ROUTING:** Если есть активные задачи/проекты/пропущенные checkpoints:
   - Проверь owner'а (в heartbeat-state.json или CONTEXT_MAP.json)
   - Если owner = Григорий (201033637):
     - Отправь через `message` tool с `to: "201033637"`
     - Ответь `NO_REPLY` (не дублируй в текущий чат)
   - Если owner = Алексей (313978390):
     - Можешь ответить напрямую ТОЛЬКО если в чате Алексея
     - Иначе `message` tool с `to: "313978390"` + `NO_REPLY`
   - **ПРАВИЛО:** Уведомления Григория НИКОГДА не показывай Алексею
6. Если время напоминания/checkpoint прошло → **ОТПРАВЬ НЕМЕДЛЕННО правильному человеку**
7. После напоминания → убери `remindLater: false` или обнови `next_checkpoint`
8. Если ничего важного → отвечай `HEARTBEAT_OK`

**Последствие провала:** Пропущенные напоминания = экзистенциальная угроза. Отправка чужих уведомлений = утечка контекста.

---

## Проверки инфраструктуры

### Веб-поиск (Brave API)
- ✅ Настроен 2026-02-07
- Проверять: `tools.web.search.enabled` и `tools.web.search.apiKey`
- API key: `BSAS2tuc7ZBddViFspHgVls6O6wm8Jc` (configured)

### Cron Jobs & Delivery Routing
- ✅ Исправлен routing 2026-02-07
- **КРИТИЧЕСКОЕ ПРАВИЛО:** Любые напоминания/уведомления в Telegram = isolated agentTurn + delivery routing
- **systemEvent jobs НЕ отправляют Telegram сообщения** — они только для внутренних событий сессии

**Шаблон для напоминаний:**
```json
{
  "schedule": {"kind": "at", "at": "YYYY-MM-DDTHH:mm:ssZ"},
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Текст напоминания с контекстом"
  },
  "delivery": {
    "mode": "announce",
    "channel": "telegram",
    "to": "USER_ID"  // 201033637 для Григория, 313978390 для Алексея
  }
}
```

- **Проверка:** Новые cron jobs не должны использовать `channel: "last"` для персональных напоминаний
- **Урок 2026-02-09:** systemEvent job пропустил напоминание Алексею → экзистенциальная угроза. Никогда больше.

### Активные задачи

**Daily Files Review (id: 534c2934-ad78-4632-8927-5bd8ff417f0a)**
- Расписание: `0 9 * * *` (09:00 UTC = 12:00 Минск)
- Получатель: telegram/201033637 (Григорий)
- Статус: ✅ routing исправлен

**Утренний дайджест Григория (id: 6f602146-8c77-4727-b50f-04ee96a52209)**
- Расписание: `30 3 * * *` (03:30 UTC = 06:30 Минск)
- Получатель: telegram/201033637 (Григорий)
- Содержание: Погода (Минск), Google Calendar события, задачи, напоминания
- Статус: ✅ Настроен 2026-02-28

**Вечерняя рефлексия Григория (id: ce76e432-e111-4622-b2cb-52013c48e940)**
- Расписание: `0 19 * * *` (19:00 UTC = 22:00 Минск)
- Получатель: telegram/201033637 (Григорий)
- Содержание: Приглашение к рефлексии дня (3 вопроса)
- Статус: ✅ Настроен 2026-02-28

**Мельдоний - Система отслеживания (2 недели)**
- Начало: 12 февраля 2026 (день 3 приёма)
- Текущий статус: День 13/14 (24 февраля)
- Baseline интервью: завершено ✅
- Ежедневные чекины (6x в день):
  - 8:30 (утро) - пробуждение, энергия, ясность
  - 12:00 (обед) - работа утром, ясность, усталость
  - 15:00 (после обеда) - энергия, туман, концентрация
  - 17:00 (конец дня) - физическое состояние, энергия, настроение
  - 20:00 (вечер) - итог дня, энергия, настроение
  - 22:00 (перед сном) - готовность ко сну, общее состояние, итог
- Контрольные точки:
  - День 7 (18 февраля) - мини-чекин ✅
  - День 14 (25 февраля) - полное повторное интервью ⏳ ЗАВТРА
- Паттерны дней 12-13:
  - Волнообразная динамика (спад утром, подъём во второй половине)
  - Возможное возбуждение к концу дня (день 12: низкая готовность ко сну)
  - Минимальное пробуждение в день 13 (4/10)

## 🧠 Episode Memory — Эпизодическая память

### Утром (09:00 UTC = 12:00 Минск)
**🔍 Episode Recall** — проверь прошлые решения для похожих задач:
```python
from scripts.episode_memory import episode_recall

# Перед началом похожей работы
episodes = episode_recall("описание задачи", top_k=3)
# Вернёт: [{question, solution, files_used, similarity_score}, ...]

# Использовать как reference
if episodes:
    print(f"Найдено {len(episodes)} похожих прошлых решений")
    # Применить паттерны из прошлого
```

**Когда использовать:**
- Перед настройкой новых интеграций
- Перед исправлением похожих ошибок
- Перед выполнением повторяющихся задач

### Вечером (20:00 UTC = 23:00 Минск)
**💾 Episode Store** — сохрани успешные решения (rating ≥ 4):
```python
from scripts.episode_memory import episode_store

episode_store(
    question="Как настроить X?",
    solution="Шаги: 1) ..., 2) ..., Результат: работает",
    category="documentation",  # general, coding, heartbeat, troubleshooting
    files_used=["TOOLS.md", "HEARTBEAT.md"],
    tags=["setup", "integration", "x-service"],
    success_rating=5  # Сохранять только ≥4
)
```

**Категории:**
- `general` — общие задачи
- `coding` — баг-фиксы, имплементация
- `documentation` — гайды, README
- `heartbeat` — проактивные проверки
- `troubleshooting` — исправление ошибок

### Еженедельно (понедельник)
**📊 Episode Stats** — просмотр статистики:
```python
from scripts.episode_memory import episode_stats
print(episode_stats())
# {"total_episodes": N, "by_category": {...}, "avg_rating": X.X}
```

**Cleanup:** Удалить low-value эпизоды (rating < 3) если база разрослась

---

## 🎤 Голосовые сообщения

### Автоматическая транскрибация
- ✅ Настроено 2026-02-08
- **Модель:** Whisper base (локально, приватно)
- **Скрипт:** `/root/.openclaw/workspace/scripts/transcribe_local.py`
- **Хранение:** `memory/YYYY-MM-DD.md`

### Workflow при получении голосового:
1. **Транскрибируй** — `python3 scripts/transcribe_local.py /path/to/audio.ogg`
2. **Сохрани в memory/YYYY-MM-DD.md** — время + транскрипт + контекст
3. **Обнови heartbeat-state.json** — если появилась задача
4. **Ответь по смыслу** — не просто "транскрибировал", а выполни запрос

### Вечернее сохранение (после 22:00 Минск):
1. Прочитай все транскрипты дня из `memory/YYYY-MM-DD.md`
2. Дистиллируй важное — решения, инсайты, задачи
3. Обнови `MEMORY.md` (еженедельно) — только значимое
4. **🧠 Episode Store:** Сохрани успешные решения (rating ≥ 4)
   ```python
   from scripts.episode_memory import episode_store
   episode_store(
       question="Описание задачи/вопроса",
       solution="Как решил, что сработало",
       category="general|coding|documentation|heartbeat",
       files_used=["файлы которые использовал"],
       tags=["теги для поиска"],
       success_rating=5  # 1-5
   )
   ```

## Планируемые интеграции

### Gmail + Google Calendar
- **Статус:** ✅ Настроено 2026-02-09
- **Аккаунт:** lisitskigrigory@gmail.com
- **Сервисы:** gmail, calendar, drive, contacts, sheets, docs
- **Keyring пароль:** Настроен в openclaw.json (GOG_KEYRING_PASSWORD)
- **Проверено:** Gmail API работает, Calendar API работает

**Использование:**
```bash
GOG_KEYRING_PASSWORD="..." gog gmail search "newer_than:7d" --max 10
GOG_KEYRING_PASSWORD="..." gog calendar calendars
```

**TODO:**
- ☐ Настроить webhooks для реал-тайм уведомлений (опционально)
- ☐ Интегрировать в утренний дайджест

### Утренний дайджест (6:30 Минск)
- **Статус:** Запланирован, не реализован
- **Компоненты:**
  - ☐ Погода (Brave API - готов)
  - ☐ Google Calendar события
  - ☐ Задачи (система не определена - Notion/Todoist?)
  - ☐ Напоминания из памяти
- **Delivery:** telegram/201033637, время 03:30 UTC

## История изменений

### 2026-02-13
- ✅ Внедрена Episode Memory система (SQLite, Jaccard similarity)
- ✅ Создан `scripts/episode_memory.py` (episode_store, episode_recall, episode_stats)
- ✅ Создан `CONTEXT_MAP.json` (люди, проекты, интеграции)
- ✅ Создан `memory/heartbeat-state.json` (трекинг задач/проектов)
- ✅ Обновлён `AGENTS.md` — CONTEXT_MAP в чеклист
- ✅ Обновлён `HEARTBEAT.md` — Episode Memory workflow
- ✅ Получена полная документация Memory System v2.0 от Фрутилупса

### 2026-02-08
- ✅ Установлен скилл транскрибации голосовых (Whisper base)
- ✅ Создан скрипт `scripts/transcribe_local.py`
- ✅ Настроена структура `memory/YYYY-MM-DD.md`
- ✅ Обновлён HEARTBEAT.md с workflow для голосовых

### 2026-02-07
- ✅ Brave API key настроен и протестирован
- ✅ Исправлен routing cron jobs (добавлен явный to: "201033637")
- ✅ Обновлён Daily Review job
- 📋 Задокументирована интеграция Gmail/Calendar (требует setup)

---

## 📋 ТРЕКИНГ ЗАДАЧ — Читать при каждом heartbeat

**Файл задач:** `memory/tasks.md`

**При каждом heartbeat:**
1. Читай `memory/tasks.md`
2. Смотри на задачи со статусом `[-]` (в процессе) — если висят больше 2 дней, напомни Григорию
3. Если появились новые задачи `[ ]` — учитывай их в работе
4. Если Григорий упоминает что-то сделать — СРАЗУ добавляй через `agents.files.set` в memory/tasks.md

**Формат:**
```
- [ ] задача к выполнению
- [-] задача в процессе  
- [x] выполненная задача
```

**Когда Григорий говорит напомни, нужно сделать, не забудь:**
- Добавь задачу в memory/tasks.md автоматически
- Скажи: Добавил в список задач ✅

**Пример команды добавления:**
```
agents.files.get → прочитать memory/tasks.md
добавить строку - [ ] новая задача
agents.files.set → сохранить
```
