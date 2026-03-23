# Architecture

## Request Flow

```mermaid
graph LR
    Browser["Browser\n(Client Dashboard)"]
    Browser -->|HTTPS / WSS| CFA["Cloudflare Access\n(Email Auth)"]
    CFA -->|Authenticated request| CFT["Cloudflare Tunnel\n(cloudflared)"]
    CFT -->|localhost| VPS["VPS : port\n(e.g. :19789)"]
    VPS -->|HTTP / WebSocket| GW["OpenClaw Gateway\n(Node.js)"]
    GW -->|Anthropic API| Claude["Claude AI\n(claude-sonnet-4-6)"]
```

## Components

| Component | Role |
|-----------|------|
| **Browser** | Standalone `app.html` dashboard served over HTTPS |
| **Cloudflare Access** | Zero-trust email-based authentication layer |
| **Cloudflare Tunnel** | Encrypted outbound tunnel — no open inbound ports on VPS |
| **VPS : port** | Hetzner (or similar) Linux server running OpenClaw |
| **OpenClaw Gateway** | WebSocket gateway that manages sessions, memory, and tool dispatch |
| **Claude AI** | Anthropic model that processes messages and executes tools |

## Deployment

Each client gets:
- A subdomain: `<name>.belagent.com`
- A dedicated Cloudflare Tunnel + Access policy (email allowlist)
- An OpenClaw instance on a unique port

Run `scripts/setup-client.sh` to provision a new client automatically.
