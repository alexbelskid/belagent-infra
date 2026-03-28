# belagent-infra — Claude Context

## What is this
White-label AI agent platform. Each client gets an OpenClaw instance on a VPS
with custom subdomain (*.belagent.com) and a custom UI.

## Repo structure
- `memory-server/` — Express API (port 3001), serves workspace .md files
- `ui/` — Fork of OpenClaw control-ui (Lit/TS), branch `belagent`
- `scripts/setup-client.sh` — one-command client deploy
- `scripts/install.sh` — installs nginx + pm2 + memory-server on fresh Ubuntu VPS
- `docs/` — mockups, architecture diagrams

## Key architecture decisions
- Cloudflare Tunnel -> nginx -> OpenClaw (19789) + memory-server (3001)
- nginx routes `/api/memory/*` to 3001, everything else to 19789
- No auth on memory-server (bound to 127.0.0.1, only reachable via nginx)
- d3-force graph: 500 silent ticks on load, tick handler stays active for drag
- Drag reheats simulation: alphaTarget(0.3).restart() on dragstart

## OpenClaw fork (branch: belagent)
- New tabs: graph (default), activity, connections
- Graph state in app-view-state.ts, controller in controllers/graph.ts
- View in views/graph.ts (BelagentGraphCanvas Lit element)

## Deploy to new client
```bash
./scripts/install.sh  # on fresh VPS
# then update cloudflared config + restart
```

## OpenClaw API
- WebSocket RPC (not REST!)
- Methods: cron.list, cron.add, sessions.list, config.get etc.
- Source on VPS: /root/.openclaw/workspace/openclaw/
- Control-UI assets: /usr/lib/node_modules/openclaw/dist/control-ui/

## Key OpenClaw configs
- gateway.controlUi.dangerouslyDisableDeviceAuth: true (removes pairing required)
- plugins.entries.device-pair.config.publicUrl: wss://<CLIENT>.belagent.com
- gateway.bind: lan (DO NOT change!)

## Pending tasks
1. Deploy graph view to client VPS (nginx + memory-server + updated UI dist)
2. Deploy pending clients via setup-client.sh
3. gws OAuth integration
4. Instagram extension (Meta Graph API)
