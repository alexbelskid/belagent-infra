#!/bin/bash
# cf-manage-emails.sh — Add or remove authorized emails for a belagent client
#
# Usage:
#   export CF_TOKEN=your-api-token
#   ./scripts/cf-manage-emails.sh --client grigory --add newuser@gmail.com
#   ./scripts/cf-manage-emails.sh --client grigory --remove olduser@gmail.com
#   ./scripts/cf-manage-emails.sh --client grigory --list

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
CLIENT_NAME=""
ADD_EMAIL=""
REMOVE_EMAIL=""
LIST_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --client)     CLIENT_NAME="$2";  shift 2 ;;
    --add)        ADD_EMAIL="$2";    shift 2 ;;
    --remove)     REMOVE_EMAIL="$2"; shift 2 ;;
    --list)       LIST_ONLY=true;    shift ;;
    --cf-token)   CF_TOKEN="$2";     shift 2 ;;
    --cf-account) CF_ACCOUNT="$2";   shift 2 ;;
    --help|-h)
      echo "Usage: $0 --client NAME [--add EMAIL | --remove EMAIL | --list]"
      echo ""
      echo "Manage authorized emails for a belagent.com client's Cloudflare Access policy."
      echo ""
      echo "Options:"
      echo "  --client NAME     Client name (e.g. grigory)"
      echo "  --add EMAIL       Add an email to the allowlist"
      echo "  --remove EMAIL    Remove an email from the allowlist"
      echo "  --list            Show current authorized emails"
      echo "  --cf-account ID   Cloudflare account ID (default: belagent account)"
      echo ""
      echo "CF_TOKEN env var is required."
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$CLIENT_NAME" ]] || die "--client is required"
[[ -n "$CF_TOKEN" ]]    || die "CF_TOKEN env var or --cf-token is required"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="${REPO_DIR}/clients/${CLIENT_NAME}/config.md"

[[ -f "$CONFIG_FILE" ]] || die "Client config not found: ${CONFIG_FILE}"

# Extract Access App ID from config.md
APP_ID=$(grep -oP 'CF Access App \| \K[a-f0-9-]+' "$CONFIG_FILE" 2>/dev/null || true)
[[ -n "$APP_ID" ]] || die "Could not find CF Access App ID in ${CONFIG_FILE}"

log "Client: ${CLIENT_NAME}"
log "Access App: ${APP_ID}"

cf_api() {
  local method="$1" path="$2"
  shift 2
  curl -sf -X "$method" "https://api.cloudflare.com/client/v4${path}" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

# Get all policies for this app
log "Fetching policies..."
POLICIES=$(cf_api GET "/accounts/${CF_ACCOUNT}/access/apps/${APP_ID}/policies")

# Extract the first allow policy and its current email list
POLICY_DATA=$(echo "$POLICIES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data.get('success'):
    print('ERROR: API call failed', file=sys.stderr)
    sys.exit(1)
for policy in data.get('result', []):
    if policy.get('decision') == 'allow':
        pid = policy['id']
        emails = []
        for rule in policy.get('include', []):
            if 'email' in rule:
                emails.append(rule['email']['email'])
        geo = []
        for rule in policy.get('require', []):
            if 'geo' in rule:
                geo.append(rule['geo']['country_code'])
        print(json.dumps({'id': pid, 'emails': emails, 'geo': geo, 'name': policy.get('name', '')}))
        break
else:
    print('ERROR: No allow policy found', file=sys.stderr)
    sys.exit(1)
")

POLICY_ID=$(echo "$POLICY_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
CURRENT_EMAILS=$(echo "$POLICY_DATA" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin)['emails']))")
CURRENT_GEO=$(echo "$POLICY_DATA" | python3 -c "import sys,json; print(','.join(json.load(sys.stdin)['geo']))")

echo ""
echo -e "${BOLD}Current authorized emails:${RESET}"
IFS=',' read -ra EMAILS <<< "$CURRENT_EMAILS"
for email in "${EMAILS[@]}"; do
  echo -e "  ${CYAN}${email}${RESET}"
done
if [[ -n "$CURRENT_GEO" ]]; then
  echo -e "${BOLD}Geo restriction:${RESET} ${CURRENT_GEO}"
fi
echo ""

if $LIST_ONLY; then
  exit 0
fi

# Build updated email list
if [[ -n "$ADD_EMAIL" ]]; then
  # Check if already exists
  if echo "$CURRENT_EMAILS" | grep -qi "$ADD_EMAIL"; then
    warn "${ADD_EMAIL} is already in the allowlist"
    exit 0
  fi
  NEW_EMAILS="${CURRENT_EMAILS},${ADD_EMAIL}"
  log "Adding: ${ADD_EMAIL}"
elif [[ -n "$REMOVE_EMAIL" ]]; then
  if ! echo "$CURRENT_EMAILS" | grep -qi "$REMOVE_EMAIL"; then
    warn "${REMOVE_EMAIL} is not in the allowlist"
    exit 0
  fi
  # Count current emails
  if [[ $(echo "$CURRENT_EMAILS" | tr ',' '\n' | wc -l) -le 1 ]]; then
    die "Cannot remove the last email — at least one must remain"
  fi
  NEW_EMAILS=$(echo "$CURRENT_EMAILS" | tr ',' '\n' | grep -vi "$REMOVE_EMAIL" | tr '\n' ',' | sed 's/,$//')
  log "Removing: ${REMOVE_EMAIL}"
else
  die "Specify --add, --remove, or --list"
fi

# Build include rules JSON
INCLUDE_JSON=$(echo "$NEW_EMAILS" | tr ',' '\n' | python3 -c "
import sys, json
emails = [line.strip() for line in sys.stdin if line.strip()]
rules = [{'email': {'email': e}} for e in emails]
print(json.dumps(rules))
")

# Build require rules JSON (preserve geo)
REQUIRE_JSON="[]"
if [[ -n "$CURRENT_GEO" ]]; then
  REQUIRE_JSON=$(echo "$CURRENT_GEO" | tr ',' '\n' | python3 -c "
import sys, json
codes = [line.strip() for line in sys.stdin if line.strip()]
rules = [{'geo': {'country_code': c}} for c in codes]
print(json.dumps(rules))
")
fi

# Update the policy
POLICY_NAME=$(echo "$POLICY_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
UPDATE_RESULT=$(cf_api PUT "/accounts/${CF_ACCOUNT}/access/apps/${APP_ID}/policies/${POLICY_ID}" \
  -d "{\"name\":\"${POLICY_NAME}\",\"decision\":\"allow\",\"precedence\":1,\"include\":${INCLUDE_JSON},\"require\":${REQUIRE_JSON}}")

SUCCESS=$(echo "$UPDATE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))")
[[ "$SUCCESS" == "True" ]] || die "Failed to update policy: $(echo "$UPDATE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('errors', []))")"

ok "Policy updated successfully!"
echo ""
echo -e "${BOLD}Updated authorized emails:${RESET}"
echo "$NEW_EMAILS" | tr ',' '\n' | while read -r email; do
  echo -e "  ${CYAN}${email}${RESET}"
done
