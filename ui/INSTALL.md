# Установка кастомного UI на OpenClaw

## Вариант A — Standalone HTML (рекомендуется для мобильных)

Файл `ui/app.html` — полностью самостоятельный дашборд.
Работает в Safari, Chrome, любом браузере без зависимостей.

**Деплой:**
```bash
scp ui/app.html root@VPS_IP:/opt/belagent-ui/index.html
# Запустить python static server или nginx
```

## Вариант B — Патч OpenClaw UI (форк Lit/TS)

Файлы в `ui/src/views/` добавляются в OpenClaw UI.

**Патч navigation.ts:**
```typescript
// Добавить в TAB_GROUPS:
{ label: "belagent", tabs: ["activity", "tasks", "connections"] }

// Добавить в type Tab:
| "activity" | "tasks" | "connections"

// Добавить в TAB_PATHS:
activity: "/activity",
tasks: "/tasks",  
connections: "/connections",
```

**Патч app-render.ts:**
```typescript
const lazyActivityFeed = createLazy(() => import("./views/activity-feed.ts"));
const lazyConnections = createLazy(() => import("./views/connections.ts"));
const lazyTasks = createLazy(() => import("./views/tasks.ts"));
```

**Сборка:**
```bash
cd openclaw/
pnpm --filter "./ui" build
rsync -az dist/control-ui/ root@VPS_IP:/usr/lib/node_modules/openclaw/dist/control-ui/
```

## Расширения (gws, instagram)

Скопировать папки из `ui/extensions/` в `/root/.openclaw/skills/` на VPS.
