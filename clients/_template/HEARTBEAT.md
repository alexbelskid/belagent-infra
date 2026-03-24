# HEARTBEAT.md — Периодические проверки

## При каждом Heartbeat

1. **Читай** `memory/heartbeat-state.json` (если существует)
2. **Проверяй** remindLater timestamps — если время пришло → напомни
3. **Проверяй** задачи в `memory/tasks.md` — если `[-]` больше 2 дней → напомни
4. **Routing:**
   - ${CLIENT_NAME} (${CLIENT_CHAT_ID}): `message` tool с `to: "${CLIENT_CHAT_ID}"`
   - Алексей (${DEVELOPER_CHAT_ID}): `message` tool с `to: "${DEVELOPER_CHAT_ID}"`
   - Уведомления одному НИКОГДА не показывай другому
5. Если ничего важного → отвечай `HEARTBEAT_OK`

## Cron Jobs — шаблон для напоминаний

```json
{
  "schedule": {"kind": "at", "at": "YYYY-MM-DDTHH:mm:ssZ"},
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Текст напоминания"
  },
  "delivery": {
    "mode": "announce",
    "channel": "telegram",
    "to": "${CLIENT_CHAT_ID}"
  }
}
```

**Правило:** systemEvent jobs НЕ отправляют Telegram сообщения — они для внутренних событий.

## Трекинг задач

**Файл задач:** `memory/tasks.md`

При каждом heartbeat:
1. Читай `memory/tasks.md`
2. `[-]` больше 2 дней → напомни ${CLIENT_NAME}
3. Если ${CLIENT_NAME} упоминает задачу → СРАЗУ добавляй через `agents.files.set`

## Вечернее сохранение (после 22:00)

1. Прочитай все заметки дня из `memory/YYYY-MM-DD.md`
2. Дистиллируй важное — решения, инсайты, задачи
3. Обнови `MEMORY.md` (еженедельно) — только значимое
