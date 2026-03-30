import{i as e}from"./lit-BZwq2xLD.js";var t=[{id:`telegram`,name:`Telegram`,icon:`✈️`,description:`Чат-бот в Telegram`,connected:!1,configurable:!0},{id:`gmail`,name:`Gmail`,icon:`📧`,description:`Получение и отправка писем`,connected:!1,configurable:!0},{id:`google-calendar`,name:`Google Calendar`,icon:`📅`,description:`События и напоминания`,connected:!1,configurable:!0},{id:`google-drive`,name:`Google Drive`,icon:`📁`,description:`Работа с файлами`,connected:!1,configurable:!0},{id:`instagram`,name:`Instagram`,icon:`📸`,description:`Посты, DM, статистика`,connected:!1,configurable:!1},{id:`whatsapp`,name:`WhatsApp`,icon:`💬`,description:`Мессенджер`,connected:!1,configurable:!0},{id:`discord`,name:`Discord`,icon:`🎮`,description:`Сервер Discord`,connected:!1,configurable:!0},{id:`signal`,name:`Signal`,icon:`🔒`,description:`Защищённый мессенджер`,connected:!1,configurable:!1}];function n(n){let{channels:r,onConnect:i,onConfigure:a}=n,o=new Set(r.map(e=>e.provider??e.channel??``)),s=t.map(e=>({...e,connected:o.has(e.id)})),c=s.filter(e=>e.connected),l=s.filter(e=>!e.connected);return e`
    <div class="connections-root">
      <style>
        .connections-root {
          max-width: 780px;
          margin: 0 auto;
          padding: 0 0 32px;
        }
        .conn-section-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--c-muted, #6b6b8a);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin: 0 0 12px;
        }
        .conn-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
          margin-bottom: 28px;
        }
        .conn-card {
          background: var(--c-surface, #13131a);
          border: 1px solid var(--c-border, #2a2a3d);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.15s;
        }
        .conn-card.connected {
          border-color: rgba(34, 197, 94, 0.3);
        }
        .conn-card:hover { border-color: var(--c-accent, #6366f1); }

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
          background: rgba(107, 107, 138, 0.1);
          color: var(--c-muted, #6b6b8a);
        }
        .conn-name {
          font-size: 14px;
          font-weight: 600;
        }
        .conn-desc {
          font-size: 12px;
          color: var(--c-muted, #6b6b8a);
        }
        .conn-actions {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }
        .conn-btn {
          flex: 1;
          padding: 6px 10px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--c-border, #2a2a3d);
          background: var(--c-surface2, #1c1c27);
          color: var(--c-text, inherit);
          transition: all 0.15s;
        }
        .conn-btn:hover { border-color: var(--c-accent, #6366f1); color: var(--c-accent, #6366f1); }
        .conn-btn.primary {
          background: var(--c-accent, #6366f1);
          border-color: var(--c-accent, #6366f1);
          color: white;
        }
        .conn-btn.primary:hover { opacity: 0.9; }
        .conn-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .conn-coming-soon {
          font-size: 10px;
          color: var(--c-muted, #6b6b8a);
          text-align: center;
          padding: 4px;
        }
      </style>

      ${c.length>0?e`
        <div class="conn-section-title">✅ Подключено</div>
        <div class="conn-grid">
          ${c.map(t=>e`
            <div class="conn-card connected">
              <div class="conn-top">
                <span class="conn-icon">${t.icon}</span>
                <span class="conn-badge on">Подключён</span>
              </div>
              <div class="conn-name">${t.name}</div>
              <div class="conn-desc">${t.description??``}</div>
              <div class="conn-actions">
                <button class="conn-btn" @click=${()=>a(t.id)}>⚙️ Настройки</button>
              </div>
            </div>
          `)}
        </div>
      `:``}

      <div class="conn-section-title">Доступные интеграции</div>
      <div class="conn-grid">
        ${l.map(t=>e`
          <div class="conn-card">
            <div class="conn-top">
              <span class="conn-icon">${t.icon}</span>
              <span class="conn-badge off">Не подключён</span>
            </div>
            <div class="conn-name">${t.name}</div>
            <div class="conn-desc">${t.description??``}</div>
            <div class="conn-actions">
              ${t.configurable?e`<button class="conn-btn primary" @click=${()=>i(t.id)}>+ Подключить</button>`:e`<div class="conn-coming-soon">Скоро</div>`}
            </div>
          </div>
        `)}
      </div>
    </div>
  `}export{n as renderConnections};
//# sourceMappingURL=connections-n_12KK8F.js.map