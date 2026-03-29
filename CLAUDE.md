# belagent-infra — Claude Context

## What is this
White-label AI agent platform. Each client gets a vanilla OpenClaw instance on a VPS
with custom subdomain (*.belagent.com).

## Repo structure
- `memory-server/` — Express API (port 3001), serves workspace .md files
- `ui/belagent-hide.css` — CSS injected into OpenClaw control-ui (hides brain/wrench/focus/cron buttons)
- `ui/extensions/` — OpenClaw skill plugins (gws, instagram)
- `scripts/setup-client.sh` — one-command client deploy
- `scripts/install.sh` — installs nginx + pm2 + memory-server on fresh Ubuntu VPS
- `scripts/gws-auth.sh` — Google Workspace OAuth setup for a VPS
- `docs/` — architecture diagrams

## Key architecture decisions
- Cloudflare Tunnel -> nginx -> OpenClaw (19789) + memory-server (3001)
- nginx routes `/api/memory/*` to 3001, everything else to 19789
- No auth on memory-server (bound to 127.0.0.1, only reachable via nginx)
- UI is vanilla OpenClaw v2026.3.23-2 — no fork, no custom build
- Branding via `belagent-hide.css` injected into `/usr/lib/node_modules/openclaw/dist/control-ui/`

## Deploy to new client
```bash
./scripts/setup-client.sh  # on fresh VPS with all args
```

## OpenClaw API
- WebSocket RPC (not REST!)
- Methods: cron.list, cron.add, sessions.list, config.get etc.
- Control-UI assets: /usr/lib/node_modules/openclaw/dist/control-ui/

## Key OpenClaw configs
- gateway.controlUi.dangerouslyDisableDeviceAuth: true (removes pairing required)
- plugins.entries.device-pair.config.publicUrl: wss://<CLIENT>.belagent.com
- gateway.bind: lan (DO NOT change!)

## Extensions (deploy to /root/.openclaw/skills/ on VPS)
- `ui/extensions/gws/` — Google Workspace via gws CLI (Gmail, Drive, Calendar, Sheets)
- `ui/extensions/instagram/` — Meta Graph API (posts, DMs, insights)

## Pending tasks
1. Deploy pending clients via setup-client.sh
2. gws OAuth re-auth (token expired on Grigory VPS — run `./scripts/gws-auth.sh --vps 89.167.22.91 --export`)
3. Instagram extension deploy

# currentDate
Today's date is 2026-03-30.
