#!/bin/bash
# setup-client.sh — Быстрый деплой нового клиента на belagent.com
# Использование: ./scripts/setup-client.sh --name grigory --vps 1.2.3.4 --email client@gmail.com --cf-token TOKEN --cf-account ACCOUNT_ID
# Предполагает: OpenClaw уже установлен на VPS, SSH доступ по ключу

set -e

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --name) CLIENT_NAME="$2"; shift 2 ;;
    --vps) VPS_IP="$2"; shift 2 ;;
    --email) CLIENT_EMAIL="$2"; shift 2 ;;
    --cf-token) CF_TOKEN="$2"; shift 2 ;;
    --cf-account) CF_ACCOUNT="$2"; shift 2 ;;
    --port) OC_PORT="${2:-18789}"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

OC_PORT="${OC_PORT:-18789}"
DOMAIN="belagent.com"
SUBDOMAIN="${CLIENT_NAME}.${DOMAIN}"
ZONE_ID="f0145f6c4985569c0d7e040e1a889523"

echo "🚀 Setting up ${SUBDOMAIN} → ${VPS_IP}"

# 1. Install cloudflared on VPS
echo "📦 Installing cloudflared..."
ssh root@${VPS_IP} "
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
  cloudflared --version
"

# 2. Create tunnel via API
echo "🌐 Creating Cloudflare Tunnel..."
TUNNEL_RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${CLIENT_NAME}\",\"config_src\":\"cloudflare\"}")

TUNNEL_ID=$(echo "$TUNNEL_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['id'])")
TUNNEL_TOKEN=$(curl -s "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel/${TUNNEL_ID}/token" \
  -H "Authorization: Bearer ${CF_TOKEN}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'])")

echo "   Tunnel ID: ${TUNNEL_ID}"

# 3. Configure tunnel ingress
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel/${TUNNEL_ID}/configurations" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"config\":{\"ingress\":[{\"hostname\":\"${SUBDOMAIN}\",\"service\":\"http://localhost:${OC_PORT}\",\"originRequest\":{\"noTLSVerify\":true}},{\"service\":\"http_status:404\"}]}}" > /dev/null

# 4. Create DNS record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"CNAME\",\"name\":\"${CLIENT_NAME}\",\"content\":\"${TUNNEL_ID}.cfargotunnel.com\",\"proxied\":true}" > /dev/null

echo "   DNS: ${SUBDOMAIN} → tunnel"

# 5. Install & start cloudflared service on VPS
echo "⚡ Starting tunnel service..."
ssh root@${VPS_IP} "
  cloudflared service install ${TUNNEL_TOKEN} 2>&1 | tail -2
  systemctl start cloudflared
  systemctl enable cloudflared
  sleep 3
  systemctl is-active cloudflared
"

# 6. Configure OpenClaw allowedOrigins & device-pair publicUrl
echo "🔧 Configuring OpenClaw..."
ssh root@${VPS_IP} "python3 << 'EOF'
import json, re

with open('/root/.openclaw/openclaw.json', 'r') as f:
    content = f.read()

# Add subdomain to allowedOrigins
if 'allowedOrigins' in content:
    content = re.sub(
        r'(\"allowedOrigins\": \[)(.*?)(\])',
        lambda m: m.group(1) + m.group(2).rstrip() + ',\n        \"https://${SUBDOMAIN}\"\n      ' + m.group(3),
        content, flags=re.DOTALL, count=1
    )

# Add device-pair publicUrl if not present
if 'device-pair' not in content and '\"entries\": {' in content:
    content = content.replace(
        '\"entries\": {',
        '\"entries\": {\n      \"device-pair\": {\"enabled\": true, \"config\": {\"publicUrl\": \"wss://${SUBDOMAIN}\"}},',
        1
    )

with open('/root/.openclaw/openclaw.json', 'w') as f:
    f.write(content)
print('OpenClaw config updated')
EOF
systemctl restart openclaw
sleep 3
systemctl is-active openclaw"

# 7. Create Cloudflare Access application
echo "🔐 Setting up Access (email auth)..."
APP_ID=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/access/apps" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${CLIENT_NAME} Command Center\",\"domain\":\"${SUBDOMAIN}\",\"type\":\"self_hosted\",\"session_duration\":\"24h\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['id'] if d['success'] else '')")

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/access/apps/${APP_ID}/policies" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Client Only\",\"decision\":\"allow\",\"precedence\":1,\"include\":[{\"email\":{\"email\":\"${CLIENT_EMAIL}\"}}]}" > /dev/null

echo ""
echo "✅ Done! Client ${CLIENT_NAME} is live:"
echo ""
echo "   URL:   https://${SUBDOMAIN}"
echo "   Email: ${CLIENT_EMAIL}"
echo ""
echo "   Get dashboard token from VPS:"
echo "   ssh root@${VPS_IP} 'openclaw dashboard --no-open'"
