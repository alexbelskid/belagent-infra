#!/bin/bash
# deploy-client.sh — Full deployment of a belagent client
#
# Usage:
#   ./scripts/deploy-client.sh <client_name> <vps_ip>
#
# Example:
#   ./scripts/deploy-client.sh lemuel 62.171.156.218
#
# Prerequisites:
#   - clients/<client_name>/openclaw.json exists
#   - clients/<client_name>/.env exists with secrets:
#       ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, BRAVE_API_KEY,
#       CF_API_TOKEN, CF_ACCOUNT_ID, CLIENT_EMAIL, OPENCLAW_PORT (optional)
#   - SSH access to VPS as root
#   - This repo cloned with openclaw/ subtree

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
log()    { echo -e "${BLUE}[•]${RESET} $*"; }
ok()     { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()   { echo -e "${YELLOW}[!]${RESET} $*"; }
error()  { echo -e "${RED}[✗]${RESET} $*" >&2; }
header() { echo -e "\n${BOLD}${CYAN}── $* ──${RESET}"; }
die()    { error "$*"; exit 1; }

# ── Arguments ───────────────────────────────────────────────────
CLIENT="${1:?Usage: $0 <client_name> <vps_ip>}"
VPS="${2:?Usage: $0 <client_name> <vps_ip>}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT_DIR="${SCRIPT_DIR}/clients/${CLIENT}"
TEMPLATE_DIR="${SCRIPT_DIR}/clients/_template"

[[ -d "$CLIENT_DIR" ]] || die "Client directory not found: $CLIENT_DIR"
[[ -f "$CLIENT_DIR/.env" ]] || die "Secrets file not found: $CLIENT_DIR/.env"

# ── Load secrets ────────────────────────────────────────────────
set -a
source "$CLIENT_DIR/.env"
set +a

OPENCLAW_PORT="${OPENCLAW_PORT:-19789}"
GATEWAY_TOKEN="${GATEWAY_TOKEN:-$(openssl rand -hex 24)}"
CLIENT_SUBDOMAIN="${CLIENT_SUBDOMAIN:-$CLIENT}"
export OPENCLAW_PORT GATEWAY_TOKEN CLIENT_SUBDOMAIN

# Validate required vars
for var in ANTHROPIC_API_KEY TELEGRAM_BOT_TOKEN; do
  [[ -n "${!var:-}" ]] || die "Missing required env var: $var (check $CLIENT_DIR/.env)"
done

header "Deploying ${CLIENT} to ${VPS}"
log "Subdomain: ${CLIENT_SUBDOMAIN}.belagent.com"
log "Port: ${OPENCLAW_PORT}"

# ── Step 1: Check VPS connectivity ──────────────────────────────
header "1/8 Checking VPS"
ssh -o ConnectTimeout=5 "root@${VPS}" "echo ok" >/dev/null 2>&1 || die "Cannot SSH to root@${VPS}"
ok "VPS reachable"

# ── Step 2: Install dependencies on VPS ─────────────────────────
header "2/8 Installing dependencies"
ssh "root@${VPS}" "bash -s" <<'REMOTE'
set -euo pipefail
# Node.js
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
# nginx
apt-get install -y -qq nginx 2>/dev/null
# pm2
command -v pm2 &>/dev/null || npm install -g pm2
# openclaw
command -v openclaw &>/dev/null || npm install -g openclaw
echo "deps OK: node=$(node -v) npm=$(npm -v) openclaw=$(openclaw --version 2>/dev/null || echo 'installed')"
REMOTE
ok "Dependencies installed"

# ── Step 3: Create workspace ────────────────────────────────────
header "3/8 Creating workspace"
ssh "root@${VPS}" "mkdir -p /root/.openclaw/workspace/memory /root/.openclaw/skills /opt/memory-server"
ok "Workspace created"

# ── Step 4: Deploy openclaw.json (substitute secrets) ───────────
header "4/8 Deploying config"

# Pick client-specific or template openclaw.json
if [[ -f "$CLIENT_DIR/openclaw.json" ]]; then
  CONFIG_SRC="$CLIENT_DIR/openclaw.json"
else
  CONFIG_SRC="$TEMPLATE_DIR/openclaw.json"
fi

# Substitute env vars in config
TMPCONFIG=$(mktemp)
envsubst < "$CONFIG_SRC" > "$TMPCONFIG"

scp "$TMPCONFIG" "root@${VPS}:/root/.openclaw/openclaw.json"
rm -f "$TMPCONFIG"
ok "openclaw.json deployed"

# ── Step 5: Deploy agent files ──────────────────────────────────
header "5/8 Deploying agent files"

for f in SOUL.md HEARTBEAT.md AGENTS.md; do
  if [[ -f "$CLIENT_DIR/$f" ]]; then
    SRC="$CLIENT_DIR/$f"
  elif [[ -f "$TEMPLATE_DIR/$f" ]]; then
    SRC="$TEMPLATE_DIR/$f"
  else
    continue
  fi
  # Substitute any template vars
  TMPFILE=$(mktemp)
  envsubst < "$SRC" > "$TMPFILE"
  scp "$TMPFILE" "root@${VPS}:/root/.openclaw/workspace/$f"
  rm -f "$TMPFILE"
  log "  $f deployed"
done
ok "Agent files deployed"

# ── Step 6: Deploy memory-server ────────────────────────────────
header "6/8 Deploying memory-server"
scp "${SCRIPT_DIR}/memory-server/index.js" "${SCRIPT_DIR}/memory-server/package.json" "root@${VPS}:/opt/memory-server/"

ssh "root@${VPS}" "bash -s" <<REMOTE
set -euo pipefail
cd /opt/memory-server
npm install --production --silent 2>&1 | tail -1

cat > .env <<'ENV'
WORKSPACE_DIR=/root/.openclaw/workspace
PORT=3001
MEMORY_API_TOKEN=
ENV

pm2 delete memory-server 2>/dev/null || true
pm2 start index.js --name memory-server --node-args="--env-file=.env"
pm2 save
pm2 startup -u root --hp /root 2>/dev/null || true
REMOTE
ok "memory-server running on port 3001"

# ── Step 7: Configure nginx ─────────────────────────────────────
header "7/8 Configuring nginx"
ssh "root@${VPS}" "bash -s" <<REMOTE
set -euo pipefail
cat > /etc/nginx/sites-available/belagent <<'NGINX'
upstream openclaw {
    server 127.0.0.1:${OPENCLAW_PORT};
}
upstream memory_api {
    server 127.0.0.1:3001;
}
server {
    listen 80 default_server;
    server_name _;
    location /api/memory/ {
        proxy_pass http://memory_api;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        proxy_pass http://openclaw;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/belagent /etc/nginx/sites-enabled/belagent
nginx -t && systemctl reload nginx
REMOTE
ok "nginx configured"

# ── Step 8: Deploy UI + start OpenClaw ──────────────────────────
header "8/8 Starting OpenClaw"

# Copy pre-built UI
UI_DIST="${SCRIPT_DIR}/openclaw/dist/control-ui"
if [[ -d "$UI_DIST" ]]; then
  scp -r "$UI_DIST"/* "root@${VPS}:/usr/lib/node_modules/openclaw/dist/control-ui/"
  ok "Custom UI deployed"
else
  warn "No pre-built UI at $UI_DIST — using default OpenClaw UI"
fi

# Install systemd service
scp "${SCRIPT_DIR}/systemd/openclaw.service" "root@${VPS}:/etc/systemd/system/openclaw.service"
ssh "root@${VPS}" "systemctl daemon-reload && systemctl enable openclaw && systemctl restart openclaw"
sleep 3

# Verify
STATUS=$(ssh "root@${VPS}" "systemctl is-active openclaw 2>/dev/null || echo 'failed'")
if [[ "$STATUS" == "active" ]]; then
  ok "OpenClaw running"
else
  error "OpenClaw failed to start — check: ssh root@${VPS} journalctl -u openclaw -n 20"
fi

# ── Summary ─────────────────────────────────────────────────────
header "Deployment complete"
echo ""
echo -e "  Client:    ${BOLD}${CLIENT}${RESET}"
echo -e "  VPS:       ${VPS}"
echo -e "  Port:      ${OPENCLAW_PORT}"
echo -e "  Token:     ${GATEWAY_TOKEN}"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo "  1. Create Cloudflare Tunnel pointing to http://localhost:80:"
echo "     ./scripts/setup-client.sh --name ${CLIENT} --vps ${VPS} --email \$CLIENT_EMAIL --cf-account \$CF_ACCOUNT_ID"
echo "  2. Open https://${CLIENT_SUBDOMAIN}.belagent.com/#token=${GATEWAY_TOKEN}"
echo ""
