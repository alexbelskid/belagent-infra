# CLAUDE.md — Belagent Infrastructure Rules

## КРИТИЧЕСКОЕ ПРАВИЛО: НИКОГДА НЕ УДАЛЯТЬ ЭЛЕМЕНТЫ OPENCLAW

Belagent — это **форк OpenClaw UI**, не замена. Все оригинальные настройки, маршруты, компоненты и API вызовы OpenClaw должны оставаться нетронутыми.

## Repo structure
- `memory-server/` — Express API (port 3001), serves workspace .md files
- `ui/` — Fork of OpenClaw control-ui (Lit/TS), branch `belagent`
- `ui/dist/` — Pre-built Belagent UI (deploy as-is)
- `scripts/setup-client.sh` — one-command client deploy (incl. CF Access + OTP + geo)
- `scripts/deploy-ui.sh` — deploy custom UI to any VPS
- `scripts/cf-setup-otp.sh` — one-time OTP identity provider setup
- `scripts/cf-manage-emails.sh` — add/remove authorized emails per client
- `scripts/cf-check-access.sh` — audit all CF Access apps and policies
- `scripts/install.sh` — installs nginx + pm2 + memory-server on fresh Ubuntu VPS
- `clients/cf-otp-provider-id.txt` — shared OTP provider ID
- `docs/security.md` — full security architecture documentation
- `docs/` — mockups, architecture diagrams

### Что ЗАПРЕЩЕНО:
- Удалять любые существующие компоненты, страницы, роуты
- Удалять или отключать API вызовы к gateway
- Удалять настройки из конфига OpenClaw
- Убирать функциональность (cron, sessions, skills, usage, connections, logs)
- Хардкодить секреты (API ключи, токены, пароли) в файлы репозитория

### Что РАЗРЕШЕНО:
- Переименовывать элементы навигации (Sessions -> Chat, Cron -> Automations)
- Перегруппировывать элементы (технические -> в раздел Advanced)
- Скрывать элементы через CSS/условный рендеринг (но не удалять код)
- Добавлять новые компоненты (Graph, Tasks kanban)
- Менять стили, цвета, иконки

## Структура навигации

```
SIDEBAR (видимая часть):
├── Chat          <- Sessions (переименовано)
├── Tasks         <- новый компонент (kanban)
├── Automations   <- Cron (переименовано)
├── Graph         <- новый компонент (d3-force memory graph)
├── Skills        <- Skills (оригинал)
└── Advanced      <- АККОРДЕОН (свёрнут по умолчанию)
    ├── Usage / Stats     <- оригинал
    ├── Connections       <- оригинал
    ├── Config / Settings <- оригинал
    └── Logs              <- оригинал

TOP BAR:
├── Chat selector dropdown   <- новый
└── Model selector dropdown  <- новый
```

## Принцип: HIDE, DON'T DELETE

Если элемент не нужен в основном UI — перемещай в Advanced, но не удаляй. Пользователь (технический) должен иметь доступ ко всему через Advanced -> раздел.

## Security (Cloudflare Zero Trust)
- Defense-in-depth: CF Access (email OTP) + OpenClaw token
- OTP Provider ID: b6265dbe-c83c-4272-b9b6-e70a16adcc6a
- Each client gets: Access App + Policy (email allowlist, geo optional via --country)
- Session: 24h, HTTP-only signed JWT cookie
- See `docs/security.md` for full details
- Manage emails: `./scripts/cf-manage-emails.sh --client NAME --add/--remove/--list`
- Audit setup: `./scripts/cf-check-access.sh`

## Active clients

| Client | URL | VPS | Tunnel ID |
|--------|-----|-----|-----------|
| Grigory | https://grigory.belagent.com | 89.167.22.91 | 74bc9f50-fed6-4af1-89c6-942ee7639177 |
| Alex (Chedron) | https://alex.belagent.com | 158.220.127.14 | 172c202b-d1a8-4c02-982c-7d3dee6b97ee |
| Lemuel (Promitei) | https://lemuel.belagent.com | 62.171.156.218 | 99e6e4e8-438d-4e25-91ff-0821b6a28800 |
| Eugene (Evgeny) | https://eugene.belagent.com | 157.173.105.69 | 541706ea-b69f-472f-a678-f638c09f0a94 |

## Mac CLIProxy туннель — правила работы

### Что это
Mac (ProxyPal на :8317) -> autossh reverse SSH -> VPS localhost:8317 -> OpenClaw openai провайдер.
Позволяет использовать GPT/Claude подписки через Mac когда OAuth недоступен на VPS.

### Где конфиги
- `mac-proxy/` — все файлы туннеля и VPS патчей
- Секреты (OPENAI_API_KEY, пароли) — только в systemd/env на VPS, не в репо

### При изменении VPS конфига OpenClaw
1. Обновить `mac-proxy/vps/agent-models.json` — если меняется провайдер/baseUrl
2. Обновить `mac-proxy/vps/apply-patch.sh` — если меняется логика применения
3. Обновить `mac-proxy/vps/openclaw-config-patch.json` — если меняется структура openclaw.json

### Добавление нового провайдера (Claude, Gemini)
После авторизации на Mac (`ccs claude --auth` / `ccs gemini --auth`):
1. Добавить провайдер в `mac-proxy/vps/agent-models.json`
2. Добавить auth profile в `mac-proxy/vps/openclaw-config-patch.json`
3. Применить на VPS: `bash mac-proxy/vps/apply-patch.sh`

## Валидация перед коммитом

Перед каждым коммитом проверить:
1. Все оригинальные роуты OpenClaw доступны (через Advanced если нужно)
2. API вызовы к gateway не сломаны
3. Sessions, Cron, Skills, Usage, Connections — всё работает
4. Новые компоненты (Tasks, Graph) не конфликтуют с оригиналом
5. Нет захардкоженных секретов в файлах

### Проверка туннеля (на VPS)
```bash
ss -tlnp | grep 8317                        # туннель активен
curl -s -H 'Authorization: Bearer proxypal-local' \
  http://localhost:8317/v1/models | python3 -m json.tool | grep id
```

### Проверка autossh (на Mac)
```bash
launchctl list | grep autossh               # сервис запущен
tail -20 /tmp/autossh-tunnel.log            # логи
```

## UI деплой

```bash
# Деплой кастомного UI на любой VPS:
./scripts/deploy-ui.sh <VPS_IP>

# После обновления OpenClaw — заново деплоить UI:
npm install -g openclaw@latest   # на VPS
./scripts/deploy-ui.sh <VPS_IP>  # с локальной машины
```

Подробнее: `ui/INSTALL.md`

## Стек

- Lit (Web Components) — оригинальный фреймворк OpenClaw UI
- d3-force — граф памяти
- Vanilla JS — Tasks kanban
- CSS custom properties — тема
- autossh + launchd — постоянный SSH туннель (Mac)
- ProxyPal / CCS CLIProxy — OAuth proxy для AI провайдеров

## Репозитории

- UI форк: `github.com/alexbelskid/openclaw` (ветка `belagent`)
- Инфра: `github.com/alexbelskid/belagent-infra`
