#!/bin/bash
# cf-check-access.sh — Audit Cloudflare Access setup for all belagent clients
#
# Usage:
#   export CF_TOKEN=your-api-token
#   ./scripts/cf-check-access.sh [--cf-account ACCOUNT_ID]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()   { echo -e "${BLUE}[•]${RESET} $*"; }
ok()    { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[!]${RESET} $*"; }
die()   { echo -e "${RED}[✗]${RESET} $*" >&2; exit 1; }

CF_TOKEN="${CF_TOKEN:-}"
CF_ACCOUNT="9443beceed90c778812b721dadb4c485"

while [[ $# -gt 0 ]]; do
  case $1 in
    --cf-account) CF_ACCOUNT="$2"; shift 2 ;;
    --cf-token)   CF_TOKEN="$2";   shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--cf-account ACCOUNT_ID] [--cf-token TOKEN]"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$CF_TOKEN" ]] || die "CF_TOKEN env var or --cf-token is required"

cf_api() {
  local method="$1" path="$2"
  shift 2
  curl -sf -X "$method" "https://api.cloudflare.com/client/v4${path}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

echo -e "${BOLD}${CYAN}Cloudflare Access Audit — belagent.com${RESET}"
echo ""

# Check identity providers
log "Identity Providers:"
IDP_RESULT=$(cf_api GET "/accounts/${CF_ACCOUNT}/access/identity_providers")
echo "$IDP_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data.get('success'):
    print('  ERROR: Could not fetch identity providers', file=sys.stderr)
    sys.exit(1)
for idp in data.get('result', []):
    status = '✅' if idp.get('type') == 'onetimepin' else '  '
    print(f'  {status} {idp[\"name\"]} (type: {idp[\"type\"]}, id: {idp[\"id\"]})')
if not data.get('result'):
    print('  ⚠️  No identity providers configured!')
"
echo ""

# List all Access applications
log "Access Applications (belagent.com):"
APPS_RESULT=$(cf_api GET "/accounts/${CF_ACCOUNT}/access/apps")
APP_IDS=$(echo "$APPS_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data.get('success'):
    print('ERROR', file=sys.stderr)
    sys.exit(1)
apps = [a for a in data.get('result', []) if 'belagent.com' in str(a.get('domain', '') or '') or 'belagent.com' in str(a.get('self_hosted_domains', []))]
if not apps:
    print('  No belagent.com apps found', file=sys.stderr)
for app in apps:
    idps = app.get('allowed_idps', [])
    idp_str = ', '.join(idps) if idps else 'default (all)'
    print(f'  {app[\"name\"]}')
    print(f'    Domain:   {app.get(\"domain\", \"?\")}')
    print(f'    App ID:   {app[\"id\"]}')
    print(f'    Session:  {app.get(\"session_duration\", \"?\")}')
    print(f'    IDPs:     {idp_str}')
    print(f'    APP_ID:{app[\"id\"]}')  # machine-readable line for loop below
")
echo ""

# For each app, show policies
echo "$APP_IDS" | grep "APP_ID:" | while IFS=: read -r _ APP_ID; do
  [[ -n "$APP_ID" ]] || continue
  log "Policies for app ${APP_ID}:"
  POLICY_RESULT=$(cf_api GET "/accounts/${CF_ACCOUNT}/access/apps/${APP_ID}/policies")
  echo "$POLICY_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data.get('success'):
    print('    ERROR: Could not fetch policies', file=sys.stderr)
    sys.exit(0)
for p in data.get('result', []):
    print(f'    Policy: {p[\"name\"]} (decision: {p[\"decision\"]})')
    for rule in p.get('include', []):
        if 'email' in rule:
            print(f'      ✉️  Email: {rule[\"email\"][\"email\"]}')
        elif 'email_domain' in rule:
            print(f'      📧 Domain: {rule[\"email_domain\"][\"domain\"]}')
    for rule in p.get('require', []):
        if 'geo' in rule:
            print(f'      🌍 Country: {rule[\"geo\"][\"country_code\"]}')
    if not p.get('require'):
        print(f'      ⚠️  No geo restriction!')
" 2>/dev/null || true
  echo ""
done

echo -e "${BOLD}Audit complete.${RESET}"
