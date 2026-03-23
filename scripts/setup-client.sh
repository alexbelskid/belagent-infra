#!/bin/bash
# setup-client.sh — Deploy a new client on belagent.com
# Usage: ./scripts/setup-client.sh --name grigory --vps 1.2.3.4 --email client@gmail.com --cf-token TOKEN --cf-account ACCOUNT_ID

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()    { echo -e "${BLUE}[•]${RESET} $*"; }
ok()     { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()   { echo -e "${YELLOW}[!]${RESET} $*"; }
error()  { echo -e "${RED}[✗]${RESET} $*" >&2; }
header() { echo -e "\n${BOLD}${CYAN}── $* ──${RESET}"; }
die()    { error "$*"; exit 1; }

# ── Argument parsing ──────────────────────────────────────────────────────────
CLIENT_NAME=""
VPS_IP=""
CLIENT_EMAIL=""
CF_TOKEN=""
CF_ACCOUNT=""
OC_PORT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --name)     CLIENT_NAME="$2";    shift 2 ;;
    --vps)      VPS_IP="$2";         shift 2 ;;
    --email)    CLIENT_EMAIL="$2";   shift 2 ;;
    --cf-token) CF_TOKEN="$2";       shift 2 ;;
    --cf-account) CF_ACCOUNT="$2";  shift 2 ;;
    --port)     OC_PORT="$2";        shift 2 ;;
    --help|-h)
      echo "Usage: $0 --name NAME --vps IP --email EMAIL --cf-token TOKEN --cf-account ACCOUNT_ID [--port PORT]"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

OC_PORT="${OC_PORT:-18789}"
DOMAIN="belagent.com"
SUBDOMAIN="${CLIENT_NAME}.${DOMAIN}"
ZONE_ID="f0145f6c4985569c0d7e040e1a889523"

# ── Validation ────────────────────────────────────────────────────────────────
header "Validating inputs"

[[ -n "$CLIENT_NAME" ]]  || die "--name is required"
[[ -n "$VPS_IP" ]]       || die "--vps is required"
[[ -n "$CLIENT_EMAIL" ]] || die "--email is required"
[[ -n "$CF_TOKEN" ]]     || die "--cf-token is required"
[[ -n "$CF_ACCOUNT" ]]   || die "--cf-account is required"

# Validate client name (alphanumeric + hyphens only)
[[ "$CLIENT_NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$ ]] \
  || die "--name must be lowercase alphanumeric (hyphens allowed, not at start/end): '$CLIENT_NAME'"

# Validate IP address format
[[ "$VPS_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] \
  || die "--vps must be a valid IPv4 address: '$VPS_IP'"

# Validate email format
[[ "$CLIENT_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]] \
  || die "--email must be a valid email address: '$CLIENT_EMAIL'"

# Validate port range
[[ "$OC_PORT" =~ ^[0-9]+$ ]] && [[ "$OC_PORT" -ge 1024 ]] && [[ "$OC_PORT" -le 65535 ]] \
  || die "--port must be a number between 1024 and 65535: '$OC_PORT'"

ok "Inputs valid"

# ── SSH connectivity check ────────────────────────────────────────────────────
header "Checking SSH connectivity"
ssh -o ConnectTimeout=10 -o BatchMode=yes "root@${VPS_IP}" "echo ok" > /dev/null 2>&1 \
  || die "Cannot connect to root@${VPS_IP} via SSH. Ensure key-based auth is set up."
ok "SSH connection to ${VPS_IP} established"

# ── Dependency check ──────────────────────────────────────────────────────────
header "Checking local dependencies"
command -v curl   >/dev/null 2>&1 || die "'curl' is required but not installed"
command -v python3 >/dev/null 2>&1 || die "'python3' is required but not installed"
ok "Dependencies satisfied"

# ── CF API helper ─────────────────────────────────────────────────────────────
cf_api() {
  local method="$1" path="$2"
  shift 2
  curl -sf -X "$method" "https://api.cloudflare.com/client/v4${path}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

check_cf_success() {
  local response="$1" label="$2"
  echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d.get('success', False):
    errors = d.get('errors', [])
    print('ERROR:', errors, file=sys.stderr)
    sys.exit(1)
" || die "Cloudflare API call failed: ${label}"
}

echo -e "\n${BOLD}Deploying ${CYAN}${SUBDOMAIN}${RESET}${BOLD} → ${CYAN}${VPS_IP}:${OC_PORT}${RESET}\n"

# ── Step 1: Install cloudflared on VPS ────────────────────────────────────────
header "Step 1/7: Installing cloudflared on VPS"
ssh "root@${VPS_IP}" "
  set -e
  if command -v cloudflared >/dev/null 2>&1; then
    echo 'cloudflared already installed: '$(cloudflared --version 2>&1 | head -1)
  else
    curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
      -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
    echo 'Installed: '$(cloudflared --version 2>&1 | head -1)
  fi
"
ok "cloudflared ready on VPS"

# ── Step 2: Create Cloudflare Tunnel ─────────────────────────────────────────
header "Step 2/7: Creating Cloudflare Tunnel"
TUNNEL_RESULT=$(cf_api POST "/accounts/${CF_ACCOUNT}/cfd_tunnel" \
  -d "{\"name\":\"${CLIENT_NAME}\",\"config_src\":\"cloudflare\"}")
check_cf_success "$TUNNEL_RESULT" "create tunnel"

TUNNEL_ID=$(echo "$TUNNEL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])")
[[ -n "$TUNNEL_ID" ]] || die "Failed to extract tunnel ID from API response"
ok "Tunnel created: ${TUNNEL_ID}"

log "Fetching tunnel token..."
TOKEN_RESULT=$(cf_api GET "/accounts/${CF_ACCOUNT}/cfd_tunnel/${TUNNEL_ID}/token")
check_cf_success "$TOKEN_RESULT" "get tunnel token"
TUNNEL_TOKEN=$(echo "$TOKEN_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'])")
[[ -n "$TUNNEL_TOKEN" ]] || die "Failed to extract tunnel token from API response"

# ── Step 3: Configure tunnel ingress ─────────────────────────────────────────
header "Step 3/7: Configuring tunnel ingress"
INGRESS_RESULT=$(cf_api PUT "/accounts/${CF_ACCOUNT}/cfd_tunnel/${TUNNEL_ID}/configurations" \
  -d "{\"config\":{\"ingress\":[
    {\"hostname\":\"${SUBDOMAIN}\",\"service\":\"http://localhost:${OC_PORT}\",\"originRequest\":{\"noTLSVerify\":true}},
    {\"service\":\"http_status:404\"}
  ]}}")
check_cf_success "$INGRESS_RESULT" "configure ingress"
ok "Ingress: ${SUBDOMAIN} → localhost:${OC_PORT}"

# ── Step 4: Create DNS record ─────────────────────────────────────────────────
header "Step 4/7: Creating DNS record"
DNS_RESULT=$(cf_api POST "/zones/${ZONE_ID}/dns_records" \
  -d "{\"type\":\"CNAME\",\"name\":\"${CLIENT_NAME}\",\"content\":\"${TUNNEL_ID}.cfargotunnel.com\",\"proxied\":true}")
check_cf_success "$DNS_RESULT" "create DNS record"
ok "DNS: ${SUBDOMAIN} → ${TUNNEL_ID}.cfargotunnel.com (proxied)"

# ── Step 5: Start cloudflared service on VPS ─────────────────────────────────
header "Step 5/7: Starting tunnel service on VPS"
ssh "root@${VPS_IP}" "
  set -e
  cloudflared service install ${TUNNEL_TOKEN} 2>&1 | tail -2 || true
  systemctl start cloudflared
  systemctl enable cloudflared
  sleep 3
  STATUS=\$(systemctl is-active cloudflared)
  echo \"cloudflared service: \$STATUS\"
  [[ \"\$STATUS\" == 'active' ]] || { journalctl -u cloudflared -n 20 --no-pager; exit 1; }
"
ok "cloudflared service active on VPS"

# ── Step 6: Configure OpenClaw ────────────────────────────────────────────────
header "Step 6/7: Configuring OpenClaw"
ssh "root@${VPS_IP}" "python3 << 'PYEOF'
import json, re, sys

config_path = '/root/.openclaw/openclaw.json'
try:
    with open(config_path, 'r') as f:
        content = f.read()
except FileNotFoundError:
    print('ERROR: openclaw.json not found at ' + config_path, file=sys.stderr)
    sys.exit(1)

subdomain = 'https://${SUBDOMAIN}'
wss_url   = 'wss://${SUBDOMAIN}'

# Add subdomain to allowedOrigins (idempotent)
if subdomain not in content and 'allowedOrigins' in content:
    content = re.sub(
        r'(\"allowedOrigins\": \[)(.*?)(\])',
        lambda m: m.group(1) + m.group(2).rstrip() + ',\n        \"' + subdomain + '\"\n      ' + m.group(3),
        content, flags=re.DOTALL, count=1
    )

# Add device-pair publicUrl if not present
if 'device-pair' not in content and '\"entries\": {' in content:
    content = content.replace(
        '\"entries\": {',
        '\"entries\": {\n      \"device-pair\": {\"enabled\": true, \"config\": {\"publicUrl\": \"' + wss_url + '\"}},',
        1
    )

with open(config_path, 'w') as f:
    f.write(content)
print('OpenClaw config updated')
PYEOF

systemctl restart openclaw
sleep 3
STATUS=\$(systemctl is-active openclaw 2>/dev/null || echo 'unknown')
echo \"openclaw service: \$STATUS\"
[[ \"\$STATUS\" == 'active' ]] || { journalctl -u openclaw -n 20 --no-pager; exit 1; }"
ok "OpenClaw configured and restarted"

# ── Step 7: Create Cloudflare Access application ──────────────────────────────
header "Step 7/7: Setting up Cloudflare Access"
APP_RESULT=$(cf_api POST "/accounts/${CF_ACCOUNT}/access/apps" \
  -d "{\"name\":\"${CLIENT_NAME} Command Center\",\"domain\":\"${SUBDOMAIN}\",\"type\":\"self_hosted\",\"session_duration\":\"24h\"}")
check_cf_success "$APP_RESULT" "create Access app"
APP_ID=$(echo "$APP_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])")
[[ -n "$APP_ID" ]] || die "Failed to extract Access app ID"

POLICY_RESULT=$(cf_api POST "/accounts/${CF_ACCOUNT}/access/apps/${APP_ID}/policies" \
  -d "{\"name\":\"Client Only\",\"decision\":\"allow\",\"precedence\":1,\"include\":[{\"email\":{\"email\":\"${CLIENT_EMAIL}\"}}]}")
check_cf_success "$POLICY_RESULT" "create Access policy"
ok "Access policy created — allowed: ${CLIENT_EMAIL}"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✅ Deployment complete!${RESET}"
echo ""
echo -e "  ${BOLD}URL:${RESET}      https://${SUBDOMAIN}"
echo -e "  ${BOLD}Email:${RESET}    ${CLIENT_EMAIL}"
echo -e "  ${BOLD}Tunnel:${RESET}   ${TUNNEL_ID}"
echo -e "  ${BOLD}Port:${RESET}     ${OC_PORT}"
echo ""
echo -e "  Get dashboard token:"
echo -e "  ${CYAN}ssh root@${VPS_IP} 'openclaw dashboard --no-open'${RESET}"
echo ""
