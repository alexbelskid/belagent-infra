# CLAUDE.md — Belagent Infrastructure Rules

## КРИТИЧЕСКОЕ ПРАВИЛО: НИКОГДА НЕ УДАЛЯТЬ ЭЛЕМЕНТЫ OPENCLAW

Belagent использует **ванильный OpenClaw v2026.3.23+** с минимальными кастомизациями (CSS + skills). Все оригинальные настройки, маршруты, компоненты и API вызовы OpenClaw должны оставаться нетронутыми.

### Что ЗАПРЕЩЕНО:
- Удалять любые существующие компоненты, страницы, роуты
- Удалять или отключать API вызовы к gateway
- Удалять настройки из конфига OpenClaw
- Убирать функциональность (cron, sessions, skills, usage, connections, logs)
- Хардкодить секреты (API ключи, токены, пароли, IP адреса клиентов) в файлы репозитория
- Удалять файлы из репо без явного подтверждения пользователя

### Что РАЗРЕШЕНО:
- Добавлять CSS кастомизации в `belagent-hide.css`
- Добавлять новые skills/extensions
- Менять стили, цвета, иконки через CSS
- Обновлять скрипты деплоя

## Repo structure

```
belagent-infra/
├── ui/
│   ├── control-ui-dist/          # Точная копия UI с VPS (OpenClaw v2026.3.23-2)
│   │   ├── index.html            # Entry point
│   │   ├── belagent-hide.css     # CSS: скрывает brain/wrench/focus кнопки в чате
│   │   ├── assets/               # JS/CSS бандлы OpenClaw (Lit, d3, etc.)
│   │   └── favicon.*             # Иконки
│   ├── belagent-hide.css         # Исходник CSS кастомизации
│   ├── app.html                  # Standalone dashboard (pure HTML, эксперимент)
│   ├── src/                      # Lit/TS компоненты (activity-feed, connections, tasks)
│   └── extensions/               # OpenClaw skill plugins
│       ├── gws/                  # Google Workspace (Gmail, Drive, Calendar, Sheets)
│       └── instagram/            # Meta Graph API (posts, DMs, insights)
├── scripts/
│   ├── setup-client.sh           # One-command деплой нового клиента
│   └── gws-auth.sh              # Google Workspace OAuth для VPS (interactive + export)
├── mac-proxy/                    # Mac CLIProxy tunnel (autossh + ProxyPal)
│   └── vps/                      # VPS-side конфиги (agent-models, patches)
└── docs/                         # Архитектурные диаграммы
```

## Архитектура

```
Client browser
  → Cloudflare Tunnel
    → nginx (VPS)
      → OpenClaw gateway (порт 18789)
        → Control UI (Lit/TS SPA)
        → WebSocket RPC API
```

- UI = ванильный OpenClaw control-ui + `belagent-hide.css`
- Навигация: Chat, Tasks, Automations, Graph, Skills, ADVANCED (Usage, Connections, Settings, Logs)
- Секреты только в systemd/env на VPS, не в репо

## Деплой нового клиента

```bash
export CF_TOKEN=xxx CF_ACCOUNT=yyy CF_ZONE_ID=zzz
./scripts/setup-client.sh --name clientname --vps IP --email client@email.com
```

Скрипт делает 8 шагов: cloudflared, tunnel, ingress, DNS, service, OpenClaw config, gws CLI + skill, Cloudflare Access.

### Деплой UI на VPS

```bash
scp -r ui/control-ui-dist/* root@VPS_IP:/usr/lib/node_modules/openclaw/dist/control-ui/
```

## OpenClaw API

- WebSocket RPC (не REST!)
- Методы: `cron.list`, `cron.add`, `sessions.list`, `config.get` и др.
- Control-UI: `/usr/lib/node_modules/openclaw/dist/control-ui/`

## Ключевые конфиги OpenClaw

- `gateway.controlUi.dangerouslyDisableDeviceAuth: true` — убирает device pairing
- `plugins.entries.device-pair.config.publicUrl: wss://<CLIENT>.belagent.com`
- `gateway.bind: lan` (НЕ МЕНЯТЬ!)

## Extensions (деплоятся в /root/.openclaw/skills/ на VPS)

- `ui/extensions/gws/` — Google Workspace через gws CLI
- `ui/extensions/instagram/` — Meta Graph API (в разработке)

### GWS OAuth на VPS

```bash
# Вариант 1: export с локальной машины
./scripts/gws-auth.sh --vps IP --export

# Вариант 2: интерактивно на VPS
./scripts/gws-auth.sh --vps IP
```

## Mac CLIProxy tunnel

Mac (ProxyPal :8317) → autossh reverse SSH → VPS localhost:8317 → OpenClaw openai провайдер.

Конфиги: `mac-proxy/vps/agent-models.json`, `mac-proxy/vps/openclaw-config-patch.json`

## Валидация перед коммитом

1. Нет захардкоженных секретов, IP адресов, токенов клиентов
2. Все оригинальные роуты OpenClaw доступны
3. API вызовы к gateway не сломаны
4. `belagent-hide.css` не ломает основной UI

## Стек

- OpenClaw v2026.3.23+ — AI gateway + control UI
- Lit (Web Components) — фреймворк UI
- Cloudflare Tunnel + Access — проксирование и авторизация
- autossh + launchd — SSH туннель с Mac
- gws CLI — Google Workspace интеграция

## Pending tasks

1. Деплой alex.belagent.com (VPS 158.220.127.14, нужен CF_ZONE_ID)
2. Instagram extension deploy
3. Re-auth gws OAuth на VPS Григория (токен expired)
