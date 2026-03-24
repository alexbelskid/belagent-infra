# CLAUDE.md — Belagent UI Rules

## 🔴 КРИТИЧЕСКОЕ ПРАВИЛО: НИКОГДА НЕ УДАЛЯТЬ ЭЛЕМЕНТЫ OPENCLAW

Belagent — это **форк OpenClaw UI**, не замена. Все оригинальные настройки, маршруты, компоненты и API вызовы OpenClaw должны оставаться нетронутыми.

### Что ЗАПРЕЩЕНО:
- ❌ Удалять любые существующие компоненты, страницы, роуты
- ❌ Удалять или отключать API вызовы к gateway
- ❌ Удалять настройки из конфига OpenClaw
- ❌ Убирать функциональность (cron, sessions, skills, usage, connections, logs)

### Что РАЗРЕШЕНО:
- ✅ Переименовывать элементы навигации (Sessions → Chat, Cron → Automations)
- ✅ Перегруппировывать элементы (технические → в раздел Advanced)
- ✅ Скрывать элементы через CSS/условный рендеринг (но не удалять код)
- ✅ Добавлять новые компоненты (Graph, Tasks kanban)
- ✅ Менять стили, цвета, иконки

## Структура навигации

```
SIDEBAR (видимая часть):
├── 💬 Chat          ← Sessions (переименовано)
├── ✅ Tasks          ← новый компонент (kanban)
├── ⚡ Automations   ← Cron (переименовано)
├── 🕸️ Graph         ← новый компонент (d3-force memory graph)
├── 🧩 Skills        ← Skills (оригинал)
└── ⚙️ Advanced      ← АККОРДЕОН (свёрнут по умолчанию)
    ├── Usage / Stats     ← оригинал
    ├── Connections       ← оригинал
    ├── Config / Settings ← оригинал
    └── Logs              ← оригинал

TOP BAR:
├── Chat selector dropdown   ← новый
└── Model selector dropdown  ← новый
```

## Принцип: HIDE, DON'T DELETE

Если элемент не нужен в основном UI — перемещай в Advanced, но не удаляй. Пользователь (технический) должен иметь доступ ко всему через Advanced → раздел.

## Валидация перед коммитом

Перед каждым коммитом проверить:
1. Все оригинальные роуты OpenClaw доступны (через Advanced если нужно)
2. API вызовы к gateway не сломаны
3. Sessions, Cron, Skills, Usage, Connections — всё работает
4. Новые компоненты (Tasks, Graph) не конфликтуют с оригиналом

## Стек

- Lit (Web Components) — оригинальный фреймворк OpenClaw UI
- d3-force — граф памяти
- Vanilla JS — Tasks kanban
- CSS custom properties — тема

## Репозитории

- UI форк: `github.com/alexbelskid/openclaw` (ветка `belagent`)
- Инфра: `github.com/alexbelskid/belagent-infra`
