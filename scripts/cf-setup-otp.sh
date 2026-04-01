#!/bin/bash
# cf-setup-otp.sh — One-time setup: create OTP identity provider in Cloudflare Zero Trust
#
# Run this ONCE per Cloudflare account. The returned provider ID is saved to
# clients/cf-otp-provider-id.txt and referenced by setup-client.sh.
#
# Usage:
#   export CF_TOKEN=your-api-token
#   ./scripts/cf-setup-otp.sh --cf-account ACCOUNT_ID

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()   { echo -e "${BLUE}[•]${RESET} $*"; }
ok()    { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[!]${RESET} $*"; }
die()   { echo -e "${RED}[✗]${RESET} $*" >&2; exit 1; }

CF_TOKEN="${CF_TOKEN:-}"
CF_ACCOUNT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --cf-account) CF_ACCOUNT="$2"; shift 2 ;;
    --cf-token)   CF_TOKEN="$2";   shift 2 ;;
    --help|-h)
      echo "Usage: $0 --cf-account ACCOUNT_ID [--cf-token TOKEN]"
      echo "  CF_TOKEN env var is preferred over --cf-token."
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$CF_ACCOUNT" ]] || die "--cf-account is required"
[[ -n "$CF_TOKEN" ]]   || die "CF_TOKEN env var or --cf-token is required"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OTP_FILE="${REPO_DIR}/clients/cf-otp-provider-id.txt"

# Check if already set up
if [[ -f "$OTP_FILE" ]]; then
  EXISTING_ID=$(cat "$OTP_FILE")
  warn "OTP provider already configured: ${EXISTING_ID}"
  warn "File: ${OTP_FILE}"
  echo ""
  read -rp "Re-create? (y/N) " CONFIRM
  [[ "$CONFIRM" =~ ^[Yy]$ ]] || { ok "Keeping existing provider."; exit 0; }
fi

cf_api() {
  local method="$1" path="$2"
  shift 2
  curl -sf -X "$method" "https://api.cloudflare.com/client/v4${path}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

# Check existing identity providers first
log "Checking existing identity providers..."
EXISTING=$(cf_api GET "/accounts/${CF_ACCOUNT}/access/identity_providers")
OTP_EXISTS=$(echo "$EXISTING" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for idp in data.get('result', []):
    if idp.get('type') == 'onetimepin':
        print(idp['id'])
        break
" 2>/dev/null || true)

if [[ -n "$OTP_EXISTS" ]]; then
  ok "OTP provider already exists in Cloudflare: ${OTP_EXISTS}"
  mkdir -p "$(dirname "$OTP_FILE")"
  echo "$OTP_EXISTS" > "$OTP_FILE"
  ok "Saved to ${OTP_FILE}"
  exit 0
fi

# Create new OTP identity provider
log "Creating One-time PIN identity provider..."
RESULT=$(cf_api POST "/accounts/${CF_ACCOUNT}/access/identity_providers" \
  -d '{"name":"Email OTP (belagent.com)","type":"onetimepin","config":{}}')

SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))")
[[ "$SUCCESS" == "True" ]] || die "Failed to create OTP provider: $(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('errors', []))")"

PROVIDER_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])")
[[ -n "$PROVIDER_ID" ]] || die "Failed to extract provider ID"

mkdir -p "$(dirname "$OTP_FILE")"
echo "$PROVIDER_ID" > "$OTP_FILE"

ok "OTP identity provider created: ${PROVIDER_ID}"
ok "Saved to ${OTP_FILE}"
echo ""
echo -e "${BOLD}Next steps:${RESET}"
echo "  - New clients will automatically use OTP via setup-client.sh"
echo "  - Existing clients need their Access app updated (use cf-manage-emails.sh)"
echo "  - Ensure clients whitelist noreply@notify.cloudflare.com in their email"
