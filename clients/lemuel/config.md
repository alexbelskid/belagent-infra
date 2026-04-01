# Lemuel (Promitei)

| Field         | Value |
|---------------|-------|
| Domain        | https://lemuel.belagent.com |
| VPS IP        | 62.171.156.218 |
| OpenClaw Port | 3000 |
| CF Tunnel ID  | 99e6e4e8-438d-4e25-91ff-0821b6a28800 |
| CF Access App | 6426770d-9ea3-4aff-8c9e-4d6fa06518c2 |
| CF Policy ID  | 23859d6d-629e-4368-9253-50786a385ce1 |
| Emails        | mark@promitei.com, ceo@promitei.com |
| OTP Provider  | b6265dbe-c83c-4272-b9b6-e70a16adcc6a |
| Deployed      | 2026-04-01T10:32:00Z |

## Get dashboard token

```bash
ssh root@62.171.156.218 'openclaw dashboard --no-open'
```

## Dashboard URL (once you have the token)

```
https://lemuel.belagent.com/#tok=PASTE_TOKEN_HERE
```

## Useful commands

```bash
# View logs
ssh root@62.171.156.218 'journalctl -u openclaw -n 50 --no-pager'

# Restart agent
ssh root@62.171.156.218 'systemctl restart openclaw'

# Check tunnel status
ssh root@62.171.156.218 'systemctl status cloudflared'
```
