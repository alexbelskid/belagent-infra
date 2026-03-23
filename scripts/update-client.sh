#!/bin/bash
# update-client.sh — Update an existing belagent client
#
# Usage:
#   ./scripts/update-client.sh <client_name> <vps_ip>
#
# What it does:
#   1. Copies updated memory-server code
#   2. Copies pre-built UI dist
#   3. Restarts memory-server + openclaw
#   4. Verifies health

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
log()    { echo -e "${BLUE}[•]${RESET} $*"; }
ok()     { echo -e "${GREEN}[✓]${RESET} $*"; }
error()  { echo -e "${RED}[✗]${RESET} $*" >&2; }
header() { echo -e "\n${BOLD}${CYAN}── $* ──${RESET}"; }

CLIENT="${1:?Usage: $0 <client_name> <vps_ip>}"
VPS="${2:?Usage: $0 <client_name> <vps_ip>}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

header "Updating ${CLIENT} on ${VPS}"

# Update memory-server
log "Updating memory-server..."
scp "${SCRIPT_DIR}/memory-server/index.js" "${SCRIPT_DIR}/memory-server/package.json" "root@${VPS}:/opt/memory-server/"
ssh "root@${VPS}" "cd /opt/memory-server && npm install --production --silent 2>/dev/null && pm2 restart memory-server"
ok "memory-server updated"

# Update UI
UI_DIST="${SCRIPT_DIR}/openclaw/dist/control-ui"
if [[ -d "$UI_DIST" ]]; then
  log "Updating UI..."
  scp -r "$UI_DIST"/* "root@${VPS}:/usr/lib/node_modules/openclaw/dist/control-ui/"
  ok "UI updated"
fi

# Restart OpenClaw
log "Restarting OpenClaw..."
ssh "root@${VPS}" "systemctl restart openclaw"
sleep 3

# Verify
STATUS=$(ssh "root@${VPS}" "systemctl is-active openclaw 2>/dev/null || echo 'failed'")
MEM_STATUS=$(ssh "root@${VPS}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/memory/health 2>/dev/null || echo '000'")

if [[ "$STATUS" == "active" && "$MEM_STATUS" == "200" ]]; then
  ok "All services healthy"
else
  error "OpenClaw: ${STATUS}, memory-server: HTTP ${MEM_STATUS}"
  error "Check: ssh root@${VPS} journalctl -u openclaw -n 20"
fi

header "Update complete"
