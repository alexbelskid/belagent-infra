# eugene

| Field         | Value |
|---------------|-------|
| Domain        | https://eugene.belagent.com |
| VPS IP        | 157.173.105.69 |
| OpenClaw Port | 18789 |
| CF Tunnel ID  | 541706ea-b69f-472f-a678-f638c09f0a94 |
| CF Access App | 88eb0b88-9db6-49ed-bed4-def1be96df53 |
| CF Policy ID  | 82398498-11ce-412f-902c-7d88ac4ebc20 |
| Email         | evgeniy.galay@gmail.com |
| Geo Restrict  |  |
| Deployed      | 2026-04-06T09:11:58Z |

## Get dashboard token

```bash
ssh root@157.173.105.69 'openclaw dashboard --no-open'
```

## Dashboard URL (once you have the token)

```
https://eugene.belagent.com/#tok=PASTE_TOKEN_HERE
```

## Useful commands

```bash
# View logs
ssh root@157.173.105.69 'journalctl -u openclaw -n 50 --no-pager'

# Restart agent
ssh root@157.173.105.69 'systemctl restart openclaw'

# Check tunnel status
ssh root@157.173.105.69 'systemctl status cloudflared'
```
