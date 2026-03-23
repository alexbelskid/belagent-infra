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

## Active clients
| Client | URL | VPS |
|--------|-----|-----|
| Григорий (Мамский дом) | https://grigory.belagent.com | 89.167.22.91 |
| Lemuel (Прометей, фарма) | pending | 62.171.156.218 |
| Евгений (Миша) | pending | 84.247.180.25 |

## Key architecture decisions
- Cloudflare Tunnel -> nginx -> OpenClaw (19789) + memory-server (3001)
- nginx routes `/api/memory/*` to 3001, everything else to 19789
- No auth on memory-server (bound to 127.0.0.1, only reachable via nginx)
- d3-force graph: 500 silent ticks on load, tick handler stays active for drag
- Drag reheats simulation: alphaTarget(0.3).restart() on dragstart

## OpenClaw fork (branch: belagent)
- Repo: https://github.com/alexbelskid/openclaw
- New tabs: graph (default), activity, connections
- Graph state in app-view-state.ts, controller in controllers/graph.ts
- View in views/graph.ts (BelagentGraphCanvas Lit element)

## Deploy to new client
```bash
./scripts/install.sh  # on fresh VPS
# then update cloudflared config + restart
```

## Cloudflare
- Domain: belagent.com
- Zone ID: f0145f6c4985569c0d7e040e1a889523
- Account ID: 9443beceed90c778812b721dadb4c485

## Grigory instance
- URL: https://grigory.belagent.com
- Tunnel ID: 74bc9f50-fed6-4af1-89c6-942ee7639177
- Dashboard: https://grigory.belagent.com/#token=90e7c81003bab38f8adc5c31d665ad72f2ab99c3318d2d28

## OpenClaw API
- WebSocket RPC (not REST!)
- Methods: cron.list, cron.add, sessions.list, config.get etc.
- Source on VPS: /root/.openclaw/workspace/openclaw/
- Control-UI assets: /usr/lib/node_modules/openclaw/dist/control-ui/

## Key OpenClaw configs
- gateway.controlUi.dangerouslyDisableDeviceAuth: true (removes pairing required)
- plugins.entries.device-pair.config.publicUrl: wss://grigory.belagent.com
- gateway.bind: lan (DO NOT change!)

## VPS tooling
- claude v2.1.81, gh v2.88.1 (logged in as alexbelskid)
- gws v0.18.1, cloudflared v2026.3.0
- everything-claude-code (106 skills)

## Pending tasks
1. Deploy graph view to Grigory VPS (nginx + memory-server + updated UI dist)
2. Run setup-client.sh for Lemuel + Evgeny
3. gws OAuth for Grigory
4. Instagram extension (Meta Graph API)
5. Quote for Anton (potential new client)
