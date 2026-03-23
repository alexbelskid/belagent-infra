# belagent.com — AI Agent Infrastructure

Полная инфраструктура для развёртывания AI-агентов клиентам через [belagent.com](https://belagent.com).

## Архитектура

```
[Клиент браузер]
     ↕ HTTPS (Cloudflare Access — auth по email)
[grigory.belagent.com]
     ↕ Cloudflare Tunnel (без открытых портов)
[VPS клиента — OpenClaw gateway]
     ↕ WebSocket
[AI Agent (Claude Sonnet)]
```

## Стек

- **OpenClaw** — AI agent framework
- **Cloudflare Tunnel** — secure public access без открытых портов
- **Cloudflare Access** — авторизация по email (magic link, бесплатно до 50 юзеров)
- **belagent.com** — родительский домен для всех клиентских поддоменов

## Клиенты

| Клиент | Домен | VPS |
|--------|-------|-----|
| Григорий (Мамский дом) | grigory.belagent.com | 89.167.22.91 |

## Структура репозитория

```
scripts/         — скрипты установки и настройки
  setup-client.sh    — быстрый деплой нового клиента
  setup-tunnel.sh    — настройка Cloudflare Tunnel
docs/            — документация
  new-client.md      — гайд по подключению нового клиента
clients/         — конфиги каждого клиента
  grigory/           — Григорий
```

## Быстрый старт (новый клиент)

```bash
./scripts/setup-client.sh \
  --name "clientname" \
  --vps "IP_ADDRESS" \
  --email "client@email.com" \
  --cf-token "CLOUDFLARE_API_TOKEN" \
  --cf-account "CLOUDFLARE_ACCOUNT_ID"
```
