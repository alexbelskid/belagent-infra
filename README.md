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

### Mac CLIProxy туннель (GPT / Claude через подписки)

```
[Mac — ProxyPal/CLIProxy :8317]
  └── autossh reverse SSH tunnel (launchd, постоянный)
          └── [VPS localhost:8317]
                  └── OpenClaw openai провайдер → gpt-5.1
```

Используется когда Claude/GPT OAuth на VPS недоступен (org-ограничения).
Mac авторизуется через браузер и пробрасывает endpoint на VPS.
Подробнее: [`mac-proxy/README.md`](mac-proxy/README.md)

## Структура репозитория

```
mac-proxy/
  README.md            — документация Mac CLIProxy туннеля
  launchd/
    com.local.autossh-tunnel.plist  — launchd автозапуск туннеля
  ssh/
    config-snippet     — фрагмент для ~/.ssh/config
  vps/
    agent-models.json  — конфиг openai провайдера (localhost:8317)
    apply-patch.sh     — скрипт применения конфига на VPS
    openclaw-config-patch.json      — патч openclaw.json
    openclaw-gateway.service.patch  — патч systemd service

scripts/
  setup-client.sh      — деплой нового клиента за 30 мин
  context_manager.py   — авто-управление контекстом агента

clients/
  _template/           — шаблон конфига нового клиента
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

## Модели (через Mac CLIProxy)

| Провайдер | Статус | Модели |
|-----------|--------|--------|
| ChatGPT / Codex | ✅ Активен | gpt-5, gpt-5.1, gpt-5.1-codex, gpt-5.2-codex, gpt-5.3-codex, gpt-5.4 |
| Claude | ⏳ Нужна авторизация | `ccs claude --auth` на Mac |
| Gemini | ⏳ Нужна авторизация | `ccs gemini --auth` на Mac |

## Стек

- **OpenClaw** — AI agent framework (MIT)
- **ProxyPal / CLIProxy** — OAuth proxy для GPT/Claude/Gemini подписок
- **autossh** — постоянный SSH reverse tunnel с Mac на VPS
- **Claude Sonnet** — основная модель (через Anthropic API key)
- **Cloudflare Tunnel** — публичный доступ без открытых портов
- **Cloudflare Access** — авторизация по email (опционально)
- **belagent.com** — родительский домен

## UI дашборд

Два варианта (см. `ui/INSTALL.md`):

**A. `ui/app.html`** — standalone, pure HTML/JS, работает в любом браузере включая Safari iOS. Подключается к gateway через WebSocket.

**B. Патч OpenClaw UI** — добавляет вкладки Activity, Tasks, Connections в стандартный Lit-based интерфейс OpenClaw.
