#!/usr/bin/env bash
# Deploy Belagent custom UI to an OpenClaw VPS
# Usage: ./scripts/deploy-ui.sh <VPS_IP> [OPENCLAW_PORT]
#
# Examples:
#   ./scripts/deploy-ui.sh 89.167.22.91          # Grigory
#   ./scripts/deploy-ui.sh 158.220.127.14         # Alex
#   ./scripts/deploy-ui.sh 62.171.156.218 19789   # Lemuel (custom port)

set -euo pipefail

VPS_IP="${1:?Usage: $0 <VPS_IP> [OPENCLAW_PORT]}"
PORT="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UI_DIST="$SCRIPT_DIR/../ui/dist"

if [[ ! -d "$UI_DIST" ]]; then
  echo "Error: ui/dist/ not found. Run from repo root or check that built UI exists."
  exit 1
fi

echo "Deploying Belagent UI to $VPS_IP..."

# Find OpenClaw control-ui path on VPS
CONTROL_UI_PATH=$(ssh "root@$VPS_IP" '
  GLOBAL_PATH="/usr/lib/node_modules/openclaw/dist/control-ui"
  LOCAL_PATH="/usr/local/lib/node_modules/openclaw/dist/control-ui"
  if [[ -d "$GLOBAL_PATH" ]]; then echo "$GLOBAL_PATH"
  elif [[ -d "$LOCAL_PATH" ]]; then echo "$LOCAL_PATH"
  else echo "NOT_FOUND"; fi
')

if [[ "$CONTROL_UI_PATH" == "NOT_FOUND" ]]; then
  echo "Error: OpenClaw control-ui directory not found on VPS"
  exit 1
fi

echo "Target: $CONTROL_UI_PATH"

# Backup original UI (first time only)
ssh "root@$VPS_IP" "
  if [[ ! -f ${CONTROL_UI_PATH}/index.html.bak ]]; then
    cp ${CONTROL_UI_PATH}/index.html ${CONTROL_UI_PATH}/index.html.bak
    echo 'Backed up original index.html'
  fi
"

# Deploy
rsync -az --delete \
  --exclude='*.map' \
  --exclude='index.html.bak' \
  "$UI_DIST/" "root@$VPS_IP:$CONTROL_UI_PATH/"

echo "UI deployed. Restarting OpenClaw..."
ssh "root@$VPS_IP" 'systemctl restart openclaw'

# Wait for startup
sleep 5

# Determine port to check
if [[ -z "$PORT" ]]; then
  PORT=$(ssh "root@$VPS_IP" "python3 -c \"
import json
with open('/root/.openclaw/openclaw.json') as f:
    print(json.load(f)['gateway']['port'])
\"")
fi

# Verify
HTTP_CODE=$(ssh "root@$VPS_IP" "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/ 2>/dev/null || echo '000'")

if [[ "$HTTP_CODE" == "200" ]]; then
  echo ""
  echo "Done! Belagent UI deployed to $VPS_IP"
  echo "OpenClaw responding on port $PORT"
else
  echo ""
  echo "Warning: OpenClaw returned HTTP $HTTP_CODE on port $PORT"
  echo "Check: ssh root@$VPS_IP 'journalctl -u openclaw -n 30'"
fi
