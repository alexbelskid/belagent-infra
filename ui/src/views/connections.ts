import { html } from "lit";
import type { ChannelUiMetaEntry, ChannelAccountSnapshot } from "../types.ts";
import { pathForTab } from "../navigation.ts";

export type ChannelsSnapshot = {
  channelAccounts?: Record<string, ChannelAccountSnapshot[]>;
  [key: string]: unknown;
};

export type ConnectionsProps = {
  basePath: string;
  channelsMeta: ChannelUiMetaEntry[];
  snapshot: ChannelsSnapshot | null;
  onNavigateToChannels: () => void;
};

type IntegrationDef = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  soon?: boolean;
};

const INTEGRATIONS: IntegrationDef[] = [
  { id: "telegram", name: "Telegram", icon: "✈️", desc: "Чат-бот в Telegram" },
  { id: "gmail", name: "Gmail", icon: "📧", desc: "Получение и отправка писем" },
  { id: "google-calendar", name: "Google Calendar", icon: "📅", desc: "События и напоминания" },
  { id: "google-drive", name: "Google Drive", icon: "📁", desc: "Работа с файлами" },
  { id: "instagram", name: "Instagram", icon: "📸", desc: "Посты, DM, статистика", soon: true },
  { id: "whatsapp", name: "WhatsApp", icon: "💬", desc: "Мессенджер" },
  { id: "discord", name: "Discord", icon: "🎮", desc: "Сервер Discord" },
  { id: "signal", name: "Signal", icon: "🔒", desc: "Защищённый мессенджер", soon: true },
];

function getChannelStatus(id: string, snapshot: ChannelsSnapshot | null): {
  connected: boolean;
  configured: boolean;
  label?: string;
} {
  if (!snapshot) return { connected: false, configured: false };

  // Check channel accounts
  const accounts = snapshot.channelAccounts?.[id] ?? [];
  if (accounts.length > 0) {
    const acc = accounts[0];
    return {
      connected: acc.connected === true || acc.running === true,
      configured: acc.configured === true,
      label: acc.name ?? undefined,
    };
  }

  // Check top-level channel status in snapshot
  const channelData = (snapshot as Record<string, unknown>)[id];
  if (channelData && typeof channelData === "object") {
    const ch = channelData as Record<string, unknown>;
    return {
      connected: ch.connected === true || ch.running === true,
      configured: ch.configured === true,
    };
  }

  return { connected: false, configured: false };
}

export function renderConnections(props: ConnectionsProps) {
  const { snapshot, onNavigateToChannels } = props;

  const items = INTEGRATIONS.map(item => {
    const status = getChannelStatus(item.id, snapshot);
    return { ...item, ...status };
  });

  const connected = items.filter(i => i.connected);
  const available = items.filter(i => !i.connected);

  return html`
    <div class="connections-root">
      <style>
        .connections-root { max-width: 900px; }

        .conn-section {
          margin-bottom: 24px;
        }
        .conn-section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--oc-color-text-3, #6b7280);
          margin-bottom: 12px;
          padding: 0 4px;
        }
        .conn-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }
        .conn-card {
          background: var(--oc-color-bg-2, #1c1c27);
          border: 1px solid var(--oc-color-border, #2a2a3d);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.15s;
        }
        .conn-card.is-connected {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.03);
        }
        .conn-card:hover {
          border-color: var(--oc-color-accent, #6366f1);
        }
        .conn-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .conn-icon { font-size: 28px; }
        .conn-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 10px;
        }
        .conn-badge.on {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }
        .conn-badge.off {
          background: rgba(107, 107, 138, 0.12);
          color: var(--oc-color-text-3, #6b7280);
        }
        .conn-badge.soon {
          background: rgba(234, 179, 8, 0.12);
          color: #ca8a04;
        }
        .conn-name {
          font-size: 14px;
          font-weight: 600;
        }
        .conn-desc {
          font-size: 12px;
          color: var(--oc-color-text-3, #6b7280);
        }
        .conn-label {
          font-size: 11px;
          color: #22c55e;
          font-weight: 500;
        }
        .conn-btn {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--oc-color-border, #2a2a3d);
          background: var(--oc-color-bg-3, #13131a);
          color: var(--oc-color-text-1, #e2e2f0);
          transition: all 0.15s;
          text-align: center;
        }
        .conn-btn:hover {
          border-color: var(--oc-color-accent, #6366f1);
          color: var(--oc-color-accent, #6366f1);
        }
        .conn-btn.primary {
          background: var(--oc-color-accent, #6366f1);
          border-color: var(--oc-color-accent, #6366f1);
          color: white;
        }
        .conn-btn.primary:hover { opacity: 0.85; }
        .conn-soon {
          font-size: 11px;
          text-align: center;
          color: var(--oc-color-text-3, #6b7280);
          padding: 4px;
        }
      </style>

      ${connected.length > 0 ? html`
        <div class="conn-section">
          <div class="conn-section-label">✅ Подключено</div>
          <div class="conn-grid">
            ${connected.map(item => html`
              <div class="conn-card is-connected">
                <div class="conn-top">
                  <span class="conn-icon">${item.icon}</span>
                  <span class="conn-badge on">Подключён</span>
                </div>
                <div>
                  <div class="conn-name">${item.name}</div>
                  ${item.label ? html`<div class="conn-label">${item.label}</div>` : ""}
                  <div class="conn-desc">${item.desc}</div>
                </div>
                <button class="conn-btn" @click=${onNavigateToChannels}>
                  ⚙️ Настройки
                </button>
              </div>
            `)}
          </div>
        </div>
      ` : ""}

      <div class="conn-section">
        <div class="conn-section-label">Доступные интеграции</div>
        <div class="conn-grid">
          ${available.map(item => html`
            <div class="conn-card">
              <div class="conn-top">
                <span class="conn-icon">${item.icon}</span>
                <span class="conn-badge ${item.soon ? "soon" : "off"}">
                  ${item.soon ? "Скоро" : "Не подключён"}
                </span>
              </div>
              <div>
                <div class="conn-name">${item.name}</div>
                <div class="conn-desc">${item.desc}</div>
              </div>
              ${item.soon
                ? html`<div class="conn-soon">В разработке</div>`
                : html`<button class="conn-btn primary" @click=${onNavigateToChannels}>+ Подключить</button>`
              }
            </div>
          `)}
        </div>
      </div>
    </div>
  `;
}
