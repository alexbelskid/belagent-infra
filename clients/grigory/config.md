# Григорий — Мамский дом

| Параметр | Значение |
|----------|----------|
| **Домен** | https://grigory.belagent.com |
| **VPS** | 89.167.22.91 (Hetzner) |
| **OpenClaw port** | 19789 |
| **Email** | lisitskigrigory@gmail.com |
| **Cloudflare Tunnel ID** | 74bc9f50-fed6-4af1-89c6-942ee7639177 |
| **CF Access App ID** | ef413303-4a53-4a56-8080-b02bb7be5d4d |

## Статус

- ✅ Cloudflare Tunnel установлен и active (fra03, fra19, fra06)
- ✅ DNS: grigory.belagent.com → CNAME → tunnel
- ✅ SSL: Full
- ✅ Cloudflare Access: только lisitskigrigory@gmail.com (magic link)
- ✅ OpenClaw: allowedOrigins включает grigory.belagent.com
- 🔧 WIP: device-pair publicUrl для auto-connect без паринга

## Dashboard URL

```
https://grigory.belagent.com/#token=90e7c81003bab38f8adc5c31d665ad72f2ab99c3318d2d28
```

## SSH

```bash
ssh root@89.167.22.91
```
