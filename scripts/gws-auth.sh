#!/bin/bash
# gws-auth.sh — Set up Google Workspace OAuth for a client VPS
#
# Usage:
#   ./scripts/gws-auth.sh --vps 1.2.3.4
#
# Two modes:
#   1. Interactive (default): SSH into VPS and run gws auth setup (needs browser URL copy-paste)
#   2. Export: Auth locally, export creds, SCP to VPS (--export flag)

set -euo pipefail

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

VPS_IP=""
EXPORT_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --vps)    VPS_IP="$2";    shift 2 ;;
    --export) EXPORT_MODE=true; shift ;;
    --help|-h)
      echo "Usage: $0 --vps IP [--export]"
      echo ""
      echo "  --vps IP      VPS IP address to configure"
      echo "  --export      Auth locally, then export creds to VPS (default: interactive on VPS)"
      exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$VPS_IP" ]] || die "--vps is required"

# ── Check SSH connectivity ────────────────────────────────────────────────────
header "Checking SSH connectivity"
ssh -o ConnectTimeout=10 -o BatchMode=yes "root@${VPS_IP}" "echo ok" > /dev/null 2>&1 \
  || die "Cannot connect to root@${VPS_IP} via SSH"
ok "SSH connection established"

# ── Check gws is installed on VPS ────────────────────────────────────────────
header "Checking gws CLI on VPS"
ssh "root@${VPS_IP}" "command -v gws >/dev/null 2>&1" \
  || die "gws CLI not installed on VPS. Run setup-client.sh first or: ssh root@${VPS_IP} 'npm install -g @googleworkspace/cli'"
GWS_VERSION=$(ssh "root@${VPS_IP}" "gws --version 2>&1 | head -1")
ok "gws CLI found: ${GWS_VERSION}"

if [[ "$EXPORT_MODE" == true ]]; then
  # ── Export mode: auth locally, SCP creds to VPS ────────────────────────────
  header "Export mode: authenticating locally"

  command -v gws >/dev/null 2>&1 \
    || die "gws CLI not installed locally. Install: npm install -g @googleworkspace/cli"

  log "Running gws auth setup locally (follow browser prompts)..."
  gws auth setup

  log "Exporting credentials..."
  TMPFILE=$(mktemp /tmp/gws-creds-XXXXXX.json)
  trap "rm -f $TMPFILE" EXIT
  gws auth export --unmasked > "$TMPFILE"

  [[ -s "$TMPFILE" ]] || die "Export produced empty file"

  header "Uploading credentials to VPS"
  ssh "root@${VPS_IP}" "mkdir -p /root/.config/gws"
  scp "$TMPFILE" "root@${VPS_IP}:/root/.config/gws/credentials.json"
  ssh "root@${VPS_IP}" "chmod 600 /root/.config/gws/credentials.json"
  ok "Credentials uploaded to VPS"

else
  # ── Interactive mode: run setup directly on VPS ────────────────────────────
  header "Interactive mode: running gws auth setup on VPS"
  warn "This requires gcloud CLI on the VPS."
  warn "If gcloud is not installed, use --export mode instead."
  echo ""
  log "Connecting to VPS for interactive auth..."
  echo -e "${YELLOW}You will need to copy-paste the OAuth URL into your browser.${RESET}"
  echo ""

  ssh -t "root@${VPS_IP}" "gws auth setup"
fi

# ── Verify ────────────────────────────────────────────────────────────────────
header "Verifying Google Workspace access"
VERIFY_RESULT=$(ssh "root@${VPS_IP}" "gws gmail users messages list --params '{\"userId\":\"me\",\"maxResults\":1}' 2>&1") || true

if echo "$VERIFY_RESULT" | grep -q '"messages"'; then
  ok "Gmail access verified — gws OAuth is working!"
elif echo "$VERIFY_RESULT" | grep -q '"resultSizeEstimate"'; then
  ok "Gmail access verified (empty inbox) — gws OAuth is working!"
else
  warn "Could not verify Gmail access. Response:"
  echo "$VERIFY_RESULT"
  warn "You may need to run: ssh root@${VPS_IP} 'gws auth login'"
fi

echo ""
echo -e "${BOLD}${GREEN}GWS OAuth setup complete for ${VPS_IP}${RESET}"
echo ""
echo -e "  Test commands on VPS:"
echo -e "  ${CYAN}ssh root@${VPS_IP} 'gws gmail users messages list --params \"{\\\"userId\\\":\\\"me\\\",\\\"maxResults\\\":5}\"'${RESET}"
echo -e "  ${CYAN}ssh root@${VPS_IP} 'gws drive files list --params \"{\\\"pageSize\\\":5}\"'${RESET}"
echo -e "  ${CYAN}ssh root@${VPS_IP} 'gws calendar events list --params \"{\\\"calendarId\\\":\\\"primary\\\",\\\"maxResults\\\":5}\"'${RESET}"
echo ""
