# Belagent UI — установка и обновление

Кастомный интерфейс для OpenClaw: синяя тема "Belagent", табы Chat / Tasks / Automations / Graph / Skills.

## Структура

```
ui/
├── dist/                # Готовый билд (деплоится на VPS как есть)
│   ├── index.html
│   ├── assets/          # JS/CSS бандлы
│   ├── belagent-hide.css
│   └── favicon.*
├── src/                 # Исходники патчей (для пересборки)
│   ├── views/           # Кастомные Lit-компоненты
│   └── controllers/     # Контроллеры
├── extensions/          # Расширения (gws, instagram)
├── app.html             # Standalone HTML дашборд (мобильная версия)
└── INSTALL.md           # Эта документация
```

## Быстрый деплой на VPS

### Скрипт (рекомендуется)

```bash
# Деплой на любой VPS с OpenClaw
./scripts/deploy-ui.sh <VPS_IP>

# Примеры:
./scripts/deploy-ui.sh 89.167.22.91       # Grigory
./scripts/deploy-ui.sh 158.220.127.14     # Alex
./scripts/deploy-ui.sh 62.171.156.218     # Lemuel
```

Скрипт автоматически:
1. Находит папку control-ui на VPS
2. Бэкапит оригинальный index.html
3. Копирует билд через rsync
4. Рестартит OpenClaw
5. Проверяет что сервис ответил 200

### Ручной деплой

```bash
# 1. Скопировать билд на VPS
rsync -az ui/dist/ root@VPS_IP:/usr/lib/node_modules/openclaw/dist/control-ui/

# 2. Рестартить OpenClaw
ssh root@VPS_IP 'systemctl restart openclaw'
```

## Обновление UI

Когда обновляется OpenClaw (`npm install -g openclaw@latest`), он перезаписывает `dist/control-ui/`.
После обновления OpenClaw нужно заново задеплоить кастомный UI:

```bash
# На VPS после обновления OpenClaw:
npm install -g openclaw@latest
# ... OpenClaw перезаписал UI ...

# С локальной машины — заново деплоим Belagent UI:
./scripts/deploy-ui.sh <VPS_IP>
```

## Сборка из исходников

Если нужно пересобрать UI (например, добавить новый таб или изменить тему):

### Пререквизиты

- Клон OpenClaw форка: `git clone https://github.com/alexbelskid/openclaw.git -b belagent`
- Node.js 22+, pnpm

### Патчи

Исходники патчей лежат в `ui/src/`. Они применяются поверх OpenClaw control-ui:

**navigation.ts** — добавить табы:
```typescript
// TAB_GROUPS:
{ label: "belagent", tabs: ["activity", "tasks", "connections"] }

// type Tab:
| "activity" | "tasks" | "connections"

// TAB_PATHS:
activity: "/activity",
tasks: "/tasks",
connections: "/connections",
```

**app-render.ts** — lazy imports:
```typescript
const lazyActivityFeed = createLazy(() => import("./views/activity-feed.ts"));
const lazyConnections = createLazy(() => import("./views/connections.ts"));
const lazyTasks = createLazy(() => import("./views/tasks.ts"));
```

### Сборка

```bash
cd openclaw/
pnpm --filter "./ui" build
```

### Обновить билд в этом репо

```bash
# Скопировать новый билд (без source maps)
rsync -a --exclude='*.map' --exclude='index.html.bak' \
  openclaw/dist/control-ui/ belagent-infra/ui/dist/

git add ui/dist/
git commit -m "feat: update Belagent UI build"
git push
```

## Расширения

Папка `ui/extensions/` содержит дополнительные навыки для OpenClaw:

- `gws/` — Google Workspace интеграция
- `instagram/` — Instagram через Meta Graph API

Установка на VPS:
```bash
scp -r ui/extensions/* root@VPS_IP:/root/.openclaw/skills/
ssh root@VPS_IP 'systemctl restart openclaw'
```

## Текущие VPS

| Клиент | IP | Порт | UI статус |
|--------|----|------|-----------|
| Grigory | 89.167.22.91 | 19789 | deployed |
| Alex | 158.220.127.14 | 18789 | deployed |
| Lemuel | 62.171.156.218 | — | pending |
| Evgeny | 84.247.180.25 | — | pending |
