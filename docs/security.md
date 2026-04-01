# Security Architecture — belagent.com

## Overview

belagent.com uses defense-in-depth with two independent authentication layers:

1. **Cloudflare Access (Zero Trust)** — email OTP + geo restriction
2. **OpenClaw Dashboard Token** — URL hash token for WebSocket auth

An attacker needs **both** to gain access.

## Authentication Flow

```
Client opens https://grigory.belagent.com
        │
        ▼
┌─────────────────────────┐
│  Cloudflare Access       │  Layer 1: Email OTP
│  - Enter email           │
│  - Receive 6-digit code  │
│  - Code valid 10 min     │
│  - Geo check (BY/RU)     │
│  - Session: 24h          │
└─────────┬───────────────┘
          │ ✅ Authenticated
          ▼
┌─────────────────────────┐
│  Dashboard loads          │  Layer 2: Token in URL hash
│  - Token in #tok=...      │
│  - Never sent to server   │
│  - WebSocket auth         │
└─────────────────────────┘
```

## End-User Login Experience

1. Open `https://clientname.belagent.com`
2. Cloudflare shows an email login page
3. Enter your email (must be on the allowlist)
4. Click "Send me a code"
5. Check email for a 6-digit code from `noreply@notify.cloudflare.com`
6. Enter the code (valid for 10 minutes)
7. Dashboard loads — you're in for 24 hours
8. After 24h, you'll need to re-authenticate with a new code

**Important:** Tell clients to whitelist `noreply@notify.cloudflare.com` in their email to avoid codes going to spam.

## Cloudflare Access Setup

### Components

| Component | Purpose |
|-----------|---------|
| **OTP Identity Provider** | Sends one-time codes via email (account-wide, ID in `clients/cf-otp-provider-id.txt`) |
| **Access Application** | Per-subdomain app that requires authentication |
| **Access Policy** | Per-app rules: which emails + which countries are allowed |

### One-Time Setup (per account)

```bash
export CF_TOKEN=your-token
./scripts/cf-setup-otp.sh --cf-account 9443beceed90c778812b721dadb4c485
```

This creates the OTP identity provider and saves its ID to `clients/cf-otp-provider-id.txt`.

### Per-Client Setup (automated)

`setup-client.sh` handles everything in Step 7:
- Creates Access Application with OTP provider
- Creates policy with email allowlist + geo restriction
- Saves App ID and Policy ID to `clients/{name}/config.md`

```bash
./scripts/setup-client.sh \
  --name clientname \
  --vps 1.2.3.4 \
  --email client@gmail.com \
  --cf-account 9443beceed90c778812b721dadb4c485 \
  --country BY,RU
```

The `--country` flag is optional (disabled by default). Pass `--country BY,RU` to enable geo restriction.

## Managing Authorized Emails

### List current emails

```bash
export CF_TOKEN=your-token
./scripts/cf-manage-emails.sh --client grigory --list
```

### Add an email

```bash
./scripts/cf-manage-emails.sh --client grigory --add newuser@gmail.com
```

### Remove an email

```bash
./scripts/cf-manage-emails.sh --client grigory --remove olduser@gmail.com
```

At least one email must remain in the policy.

## Auditing Access

```bash
export CF_TOKEN=your-token
./scripts/cf-check-access.sh
```

Shows all Access apps, their policies, authorized emails, and geo restrictions.

## Geo Restriction (Optional)

Geo restriction is **disabled by default**. It adds a `require` clause with country codes so the user must be in an allowed country **AND** have an authorized email.

**Not recommended** for clients who use VPN or travel frequently — they'll be blocked when connecting from outside the allowed countries.

To enable for a specific client, pass `--country` during setup:
```bash
./scripts/setup-client.sh --name clientname ... --country BY,RU
```

Common country codes (ISO 3166-1 Alpha-2):

| Code | Country |
|------|---------|
| BY | Belarus |
| RU | Russia |

To add/remove geo restriction on an existing client, update the policy via CF API.

## Session Management

- **Session duration:** 24 hours (configurable per app)
- **Session cookie:** `CF_Authorization` (HTTP-only, signed JWT)
- **Re-auth:** After 24h, user must enter a new OTP code
- **Logout:** Clear browser cookies or wait for session expiry

## Security Checklist

- [x] Email OTP authentication (no passwords)
- [x] Per-client email allowlist
- [ ] Geo restriction (optional, pass --country to enable)
- [x] 24h session expiry
- [x] Dashboard token as secondary auth
- [x] No open inbound ports on VPS (tunnel only)
- [x] Token in URL hash (never sent to server in HTTP requests)
- [x] CF API token stored in env var (not in code)

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Dashboard link leaks | CF Access blocks without email OTP |
| Email compromised | Geo restriction limits access to BY/RU |
| Token stolen | CF Access still required — token alone is useless |
| VPN from wrong country | Email OTP still required |
| Both email + token compromised | Geo restriction adds friction; revoke token via OpenClaw |
| Session hijacking | HTTP-only signed JWT cookie, 24h expiry |

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/cf-setup-otp.sh` | One-time: create OTP identity provider |
| `scripts/cf-manage-emails.sh` | Add/remove/list authorized emails per client |
| `scripts/cf-check-access.sh` | Audit all Access apps and policies |
| `scripts/setup-client.sh` | Full client deploy (includes Access setup) |
