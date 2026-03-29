# Plan: GWS OAuth Integration

## Phase 1 — Deploy + Manual Auth (server-side)

### 1.1 Add `gws` install to `setup-client.sh`
Add a step after OpenClaw config (Step 6) that:
- Installs `@googleworkspace/cli` globally via npm on the VPS
- Creates `/root/.config/gws/` directory
- Copies `ui/extensions/gws/` to `/root/.openclaw/skills/gws/` on the VPS

### 1.2 Create `scripts/gws-auth.sh` — per-client auth helper
Interactive script to run on your local machine:
```
./scripts/gws-auth.sh --vps 1.2.3.4
```
What it does:
1. SSH into VPS, run `gws auth setup` interactively (needs browser — opens URL)
2. OR: run `gws auth login` locally, then `gws auth export --unmasked > creds.json`, SCP to VPS as `/root/.config/gws/credentials.json`
3. Verify with `gws gmail users messages list --params '{"userId":"me","maxResults":1}'`

### 1.3 Update SKILL.md with headless auth instructions
Add the `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` env var approach for VPS deployment (since no browser on server).

---

## Phase 2 — UI-Driven OAuth Flow

### 2.1 Add `gws-auth` endpoint to `memory-server`
New Express route `POST /api/gws/auth/start`:
- Builds Google OAuth URL with client_id, redirect_uri, scopes
- Returns URL to frontend

New route `GET /api/gws/auth/callback`:
- Receives OAuth code from Google redirect
- Exchanges for refresh_token via Google token endpoint
- Writes credentials to `/root/.config/gws/credentials.json`
- Redirects back to UI with success status

New route `GET /api/gws/auth/status`:
- Checks if `/root/.config/gws/credentials.json` exists and is valid
- Returns `{ connected: true/false, email: "..." }`

### 2.2 Update connections.ts UI
Change the Gmail/Calendar/Drive "Connect" buttons:
- Instead of `onNavigateToChannels`, call the new `/api/gws/auth/start` endpoint
- Open returned OAuth URL in a popup/new tab
- Poll `/api/gws/auth/status` until connected
- Update card status to "connected" with the Google email

Group Gmail, Calendar, Drive under a single "Google Workspace" card since they share one OAuth token.

### 2.3 Store OAuth client_id/secret in openclaw.json plugin config
```json
{
  "plugins": {
    "entries": {
      "gws": {
        "enabled": true,
        "config": {
          "clientId": "...",
          "clientSecret": "...",
          "redirectUri": "https://CLIENT.belagent.com/api/gws/auth/callback"
        }
      }
    }
  }
}
```

### 2.4 Update nginx config
Add route `/api/gws/*` → memory-server (port 3001), alongside existing `/api/memory/*`.

---

## Files to create/modify

**Phase 1:**
- `scripts/setup-client.sh` — add gws install step
- `scripts/gws-auth.sh` — new file, auth helper
- `ui/extensions/gws/skills/gws/SKILL.md` — add headless auth docs

**Phase 2:**
- `memory-server/` — needs to exist first (Express app)
- `memory-server/routes/gws-auth.ts` — new OAuth routes
- `ui/src/views/connections.ts` — wire Connect buttons to OAuth flow
- `docs/gws-oauth.md` — architecture doc

## Resolved questions
- **memory-server**: Already deployed on VPS, just not in repo. Phase 2 routes get added to the existing Express app on the VPS.
- **OAuth apps**: Per-client — each client gets their own GCP project and OAuth credentials. `gws auth setup` creates the project per-client.
