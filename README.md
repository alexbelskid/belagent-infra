# belagent.com — AI Agent Infrastructure

Полная инфраструктура для развёртывания AI-агентов клиентам.

## Архитектура

```
[Клиент — браузер / телефон]
         ↕ HTTPS
[client.belagent.com]
         ↕ Cloudflare Tunnel (без открытых портов)
[VPS клиента — OpenClaw gateway :18789]
         ↕ WebSocket
[Claude AI Agent]
```

## Структура репозитория

```
scripts/
  setup-client.sh      — деплой нового клиента за 30 мин
  context_manager.py   — авто-управление контекстом агента

clients/
  grigory/             — конфиг клиента Григорий (Мамский дом)

ui/
  app.html             — standalone дашборд (pure HTML, работает везде)
  mockup.html          — статичный прототип дизайна
  INSTALL.md           — инструкция установки
  src/
    views/
      activity-feed.ts — вкладка Активность (Lit/TS для OpenClaw UI)
      connections.ts   — вкладка Подключения
      tasks.ts         — вкладка Задачи (kanban)
    controllers/
      tasks.ts         — контроллер задач (file API)
  extensions/
    gws/               — Google Workspace (официальный gws CLI)
    instagram/         — Meta Graph API (посты, DM, insights)

docs/
  grigory-tutorial.md  — инструкция для клиента
  ui-concept.md        — концепт UI (business/personal mode)
```

## Быстрый старт — новый клиент

```bash
./scripts/setup-client.sh \
  --name "clientname" \
  --vps "IP" \
  --email "client@email.com" \
  --cf-token "CLOUDFLARE_TOKEN" \
  --cf-account "ACCOUNT_ID"
```

## Клиенты

| Клиент | Домен | VPS | Статус |
|--------|-------|-----|--------|
| Григорий (Мамский дом) | grigory.belagent.com | 89.167.22.91 | ✅ Live |

## Стек

- **OpenClaw** — AI agent framework (MIT)
- **Claude Sonnet** — модель
- **Cloudflare Tunnel** — публичный доступ без открытых портов
- **Cloudflare Access** — авторизация по email (опционально)
- **belagent.com** — родительский домен

## UI дашборд

Два варианта (см. `ui/INSTALL.md`):

**A. `ui/app.html`** — standalone, pure HTML/JS, работает в любом браузере включая Safari iOS. Подключается к gateway через WebSocket.

**B. Патч OpenClaw UI** — добавляет вкладки Activity, Tasks, Connections в стандартный Lit-based интерфейс OpenClaw.
