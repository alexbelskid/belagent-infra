#!/bin/bash
# Применить конфиг Mac CLIProxy туннеля на VPS
# Запускать на VPS после установки OpenClaw
set -e

PROXYPAL_API_KEY="${PROXYPAL_API_KEY:-proxypal-local}"

echo "=== 1. Обновляем agent models.json ==="
AGENT_MODELS="/root/.openclaw/agents/main/agent/models.json"
cp "$AGENT_MODELS" "$AGENT_MODELS.bak" 2>/dev/null || true

cat > "$AGENT_MODELS" << EOF
{
  "providers": {
    "openai-codex": {
      "baseUrl": "https://chatgpt.com/backend-api",
      "api": "openai-codex-responses",
      "models": []
    },
    "openai": {
      "baseUrl": "http://localhost:8317/v1",
      "api": "openai-completions",
      "models": []
    }
  }
}
EOF
echo "   ✓ models.json обновлён"

echo "=== 2. Добавляем openai auth profile в openclaw.json ==="
python3 - << PYEOF
import json

path = '/root/.openclaw/openclaw.json'
with open(path, 'r') as f:
    cfg = json.load(f)

cfg['auth']['profiles']['openai:default'] = {
    'provider': 'openai',
    'mode': 'api_key'
}

cfg['agents']['defaults']['model']['primary'] = 'openai/gpt-5.1'
cfg['agents']['defaults']['models']['openai/gpt-5.1'] = {}
cfg['agents']['defaults']['models']['openai/gpt-5.4'] = {}

with open(path, 'w') as f:
    json.dump(cfg, f, indent=2)

print('   ✓ openclaw.json обновлён')
PYEOF

echo "=== 3. Добавляем OPENAI_API_KEY в systemd service ==="
SERVICE="/root/.config/systemd/user/openclaw-gateway.service"
if ! grep -q "OPENAI_API_KEY" "$SERVICE"; then
    sed -i "/Environment=ANTHROPIC_API_KEY=/a Environment=OPENAI_API_KEY=$PROXYPAL_API_KEY" "$SERVICE"
    echo "   ✓ OPENAI_API_KEY добавлен"
else
    echo "   ✓ OPENAI_API_KEY уже есть"
fi

echo "=== 4. Перезапуск gateway ==="
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway
sleep 3
systemctl --user is-active openclaw-gateway && echo "   ✓ gateway запущен" || echo "   ✗ gateway не запустился"

echo ""
echo "=== Готово ==="
echo "Убедись что SSH туннель с Mac активен:"
echo "  ss -tlnp | grep 8317"
echo ""
echo "Тест endpoint:"
echo "  curl -s -H 'Authorization: Bearer $PROXYPAL_API_KEY' http://localhost:8317/v1/models | python3 -m json.tool | grep id"
