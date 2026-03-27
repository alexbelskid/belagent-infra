# Mac CLIProxy → VPS Tunnel

Схема: Mac (ProxyPal/CLIProxy на :8317) → SSH reverse tunnel → VPS (OpenClaw использует localhost:8317)

## Зачем

Claude OAuth на Linux/VPS не работает из-за org-ограничений.
Mac авторизуется через браузер, затем пробрасывает endpoint на VPS через SSH reverse tunnel.

## Архитектура

```
Mac (ProxyPal :8317)
    └── autossh reverse tunnel
            └── VPS localhost:8317
                    └── OpenClaw gateway (openai/gpt-5.1)
```

## Компоненты

| Компонент | Где | Описание |
|-----------|-----|----------|
| ProxyPal | Mac | CLIProxy-совместимый proxy, авторизует Codex/GPT через OAuth |
| autossh | Mac | Держит SSH reverse tunnel живым, автозапуск через launchd |
| OpenClaw | VPS | Использует `openai` провайдер → localhost:8317 |

## Быстрый старт (Mac)

```bash
# 1. Установить зависимости
brew install autossh sshpass

# 2. Сгенерировать SSH ключ (если нет)
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -C "mac-autossh-tunnel"

# 3. Залить ключ на VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@<VPS_IP>

# 4. Добавить SSH config (см. ssh/config-snippet)
cat mac-proxy/ssh/config-snippet >> ~/.ssh/config

# 5. Запустить autossh tunnel через launchd
cp mac-proxy/launchd/com.local.autossh-tunnel.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.local.autossh-tunnel.plist

# 6. Проверить
ssh vmi-tunnel "curl -s -H 'Authorization: Bearer proxypal-local' http://localhost:8317/v1/models | python3 -m json.tool | grep id"
```

## Провайдеры (ProxyPal на Mac)

| Провайдер | Статус | Модели |
|-----------|--------|--------|
| Codex (ChatGPT) | ✅ Активен | gpt-5, gpt-5.1, gpt-5.1-codex, gpt-5.2-codex, gpt-5.3-codex, gpt-5.4 |
| Claude | ⏳ Нужна авторизация | `ccs claude --auth` |
| Gemini | ⏳ Нужна авторизация | `ccs gemini --auth` |

## Авторизация провайдеров на Mac

```bash
# ChatGPT/Codex (уже настроен)
ccs codex --auth

# Claude (нужно залогиниться в браузере)
ccs claude --auth

# После добавления провайдера — рестарт
ccs cliproxy restart
```

## Управление туннелем

```bash
# Статус
launchctl list | grep autossh

# Перезапуск
launchctl stop com.local.autossh-tunnel
launchctl start com.local.autossh-tunnel

# Логи
tail -f /tmp/autossh-tunnel.log

# Удалить из автозапуска
launchctl unload ~/Library/LaunchAgents/com.local.autossh-tunnel.plist
```

## Конфигурация VPS (OpenClaw)

Изменения внесены в:
- `/root/.openclaw/agents/main/agent/models.json` — добавлен openai провайдер
- `/root/.openclaw/openclaw.json` — добавлен `openai:default` auth profile, модель `openai/gpt-5.1`
- `/root/.config/systemd/user/openclaw-gateway.service` — добавлен `OPENAI_API_KEY`

Актуальные конфиги: см. `vps/` в этой папке.
