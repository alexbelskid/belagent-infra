# Troubleshooting

Quick reference for the most common issues when deploying and operating belagent.com clients.

---

## Dashboard shows "Нет токена" or won't connect

**Cause:** The dashboard URL is missing the `#tok=TOKEN` fragment.

**Fix:** Get the token from the VPS and append it to the URL:
```bash
ssh root@VPS_IP 'openclaw dashboard --no-open'
# → prints: http://localhost:PORT?token=TOKEN
```
Open the dashboard with the token in the URL hash:
```
https://name.belagent.com/#tok=TOKEN
```
The hash (`#tok=`) is never sent to the server — it stays browser-side only.

---

## Dashboard connects but immediately disconnects

1. **Check OpenClaw is running:**
   ```bash
   ssh root@VPS_IP 'systemctl status openclaw'
   ```
2. **Check the tunnel is up:**
   ```bash
   ssh root@VPS_IP 'systemctl status cloudflared'
   ```
3. **Check logs for errors:**
   ```bash
   ssh root@VPS_IP 'journalctl -u openclaw -n 50 --no-pager'
   ```

---

## Cloudflare Access blocks the user (403 / "Access denied")

**Cause:** The client's email is not in the Access policy, or they're using the wrong email.

**Fix:** Add the email via the Cloudflare dashboard, or re-run the policy step:
```bash
# Get the Access app ID from clients/NAME/config.md, then:
curl -sf -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/access/apps/$APP_ID/policies" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Client Only","decision":"allow","precedence":1,"include":[{"email":{"email":"NEW@EMAIL.COM"}}]}'
```

---

## setup-client.sh fails midway — tunnel or DNS already created

The script prints cleanup instructions on failure. Run the suggested commands to remove partial resources, then re-run the script.

Manual cleanup:
```bash
# Delete tunnel
curl -sf -X DELETE "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/cfd_tunnel/$TUNNEL_ID" \
  -H "Authorization: Bearer $CF_TOKEN"

# Delete Access app
curl -sf -X DELETE "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/access/apps/$APP_ID" \
  -H "Authorization: Bearer $CF_TOKEN"

# Delete DNS CNAME — get record ID first:
curl -sf "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=NAME.belagent.com" \
  -H "Authorization: Bearer $CF_TOKEN" | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin)['result']]"
# Then delete:
curl -sf -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_TOKEN"
```

---

## OpenClaw config not updating after setup

The script restarts OpenClaw via `systemctl restart openclaw`. If the service didn't restart cleanly:
```bash
ssh root@VPS_IP 'systemctl restart openclaw && sleep 2 && systemctl status openclaw'
```
Then verify the config was written:
```bash
ssh root@VPS_IP 'cat /root/.openclaw/openclaw.json'
```

---

## cloudflared service fails to start on VPS

```bash
ssh root@VPS_IP 'journalctl -u cloudflared -n 30 --no-pager'
```
Common causes:
- **Tunnel token invalid:** Delete the tunnel in Cloudflare dashboard and re-create via the script.
- **Port conflict:** Another service is already using the OpenClaw port. Change port with `--port`.
- **Outdated cloudflared binary:** Reinstall with `curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared`.

---

## Agent not responding to messages

1. Check OpenClaw is running (above).
2. Check `ANTHROPIC_API_KEY` is set and valid:
   ```bash
   ssh root@VPS_IP 'systemctl show openclaw --property=Environment | grep ANTHROPIC'
   ```
3. Check for rate-limiting errors in the logs:
   ```bash
   ssh root@VPS_IP 'journalctl -u openclaw -n 100 --no-pager | grep -i "error\|rate\|limit"'
   ```

---

## Tasks not saving

The tasks view writes to `memory/tasks.md` via `agents.files.set` RPC. If saves silently fail:
1. Check the browser console for WebSocket errors.
2. Confirm the dashboard token has write permissions (tokens from `openclaw dashboard` have full access).
3. Check disk space on the VPS: `ssh root@VPS_IP 'df -h /root'`.
