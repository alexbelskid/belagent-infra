# Григорий — Мамский дом

| Параметр | Значение |
|----------|----------|
| **Домен** | https://grigory.belagent.com |
| **VPS** | 89.167.22.91 (Hetzner) |
| **OpenClaw port** | 19789 |
| **Email (CF Access)** | lisitskigrigory@gmail.com |
| **Cloudflare Tunnel ID** | 74bc9f50-fed6-4af1-89c6-942ee7639177 |
| **CF Access App ID** | e3b23bbc-daf7-4538-a6d6-8d504da89061 |
| **CF Policy ID** | a8f46f38-e23c-48e8-a7ec-efca6e6784f0 |
| **Geo Restriction** | none |
| **OTP Provider** | b6265dbe-c83c-4272-b9b6-e70a16adcc6a |

## Статус: ✅ LIVE

- ✅ Cloudflare Tunnel (fra03, fra19, fra06)
- ✅ DNS: grigory.belagent.com → CNAME → tunnel
- ✅ SSL: Full
- ✅ Cloudflare Access: только lisitskigrigory@gmail.com (OTP email login)
- ✅ No geo restriction
- ✅ `dangerouslyDisableDeviceAuth: true` — внешнее подключение без device pairing
- ✅ `plugins.device-pair.publicUrl: wss://grigory.belagent.com`
- ✅ Dashboard подключается автоматически по токену

## Dashboard URL (прямая ссылка)

```
https://grigory.belagent.com/#tok=DASHBOARD_TOKEN
```

Получить токен: `ssh root@89.167.22.91 'openclaw dashboard --no-open'`

## Ключевые настройки openclaw.json на VPS

```json
{
  "gateway": {
    "port": 19789,
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true,
      "allowedOrigins": ["https://grigory.belagent.com"]
    }
  },
  "plugins": {
    "entries": {
      "device-pair": {
        "enabled": true,
        "config": { "publicUrl": "wss://grigory.belagent.com" }
      }
    }
  }
}
```

## SSH

```bash
ssh root@89.167.22.91
```
