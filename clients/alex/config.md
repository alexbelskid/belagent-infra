# alex

| Field         | Value |
|---------------|-------|
| Domain        | https://alex.belagent.com |
| VPS IP        | 158.220.127.14 |
| OpenClaw Port | 18789 |
| CF Tunnel ID  | 172c202b-d1a8-4c02-982c-7d3dee6b97ee |
| CF Access App | 454f4c43-0088-4cf1-a872-113376a5e611 |
| CF Policy ID  | ee4cd2b5-4234-4c3c-8042-15edde2b1a2b |
| Email         | alexbelskid@gmail.com |
| Geo Restrict  |  |
| Deployed      | 2026-03-30T13:23:05Z |

## Get dashboard token

```bash
ssh root@158.220.127.14 'openclaw dashboard --no-open'
```

## Dashboard URL (once you have the token)

```
https://alex.belagent.com/#tok=PASTE_TOKEN_HERE
```

## Useful commands

```bash
# View logs
ssh root@158.220.127.14 'journalctl -u openclaw -n 50 --no-pager'

# Restart agent
ssh root@158.220.127.14 'systemctl restart openclaw'

# Check tunnel status
ssh root@158.220.127.14 'systemctl status cloudflared'
```
