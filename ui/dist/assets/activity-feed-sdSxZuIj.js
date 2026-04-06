import{i as e,n as t}from"./lit-BZwq2xLD.js";function n(e){switch(e){case`message`:return`💬`;case`cron`:return`⚡`;case`memory`:return`🧠`;case`connection`:return`🔌`;case`error`:return`⚠️`;case`system`:return`🔧`;default:return`•`}}function r(e){switch(e){case`message`:return`var(--c-accent, #C8001E)`;case`cron`:return`#eab308`;case`memory`:return`#6B7280`;case`connection`:return`#22c55e`;case`error`:return`#ef4444`;case`system`:return`#6b7280`;default:return`var(--c-accent, #C8001E)`}}function i(e){let t=Date.now()-e;if(t<6e4)return`только что`;if(t<36e5)return`${Math.floor(t/6e4)} мин назад`;if(t<864e5){let t=new Date(e);return`${t.getHours().toString().padStart(2,`0`)}:${t.getMinutes().toString().padStart(2,`0`)}`}return`вчера`}function a(e){let t=[];for(let n of e){let e=n.label??n.key??`Сессия`,r=n.updatedAt??n.createdAt??Date.now();n.key?.includes(`cron`)?t.push({id:n.key,kind:`cron`,title:`Запущена автоматизация`,description:e,timestamp:r}):n.key?.includes(`telegram`)||n.key?.includes(`direct`)?t.push({id:n.key,kind:`message`,title:`Сообщение обработано`,description:n.label??`Диалог`,timestamp:r}):t.push({id:n.key??String(Math.random()),kind:`system`,title:`Действие агента`,description:e,timestamp:r})}return t.sort((e,t)=>t.timestamp-e.timestamp).slice(0,50)}function o(a){let{loading:o,events:s,onRefresh:c}=a;return e`
    <div class="activity-feed-root">
      <style>
        .activity-feed-root {
          max-width: 780px;
          margin: 0 auto;
          padding: 0 0 32px;
        }
        .af-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .af-title {
          font-size: 18px;
          font-weight: 700;
        }
        .af-refresh {
          background: var(--c-surface2, #1c1c27);
          border: 1px solid var(--c-border, #2a2a3d);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          color: var(--c-text, inherit);
          transition: border-color 0.15s;
        }
        .af-refresh:hover { border-color: var(--c-accent, #C8001E); }

        .af-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .af-stat {
          background: var(--c-surface, #13131a);
          border: 1px solid var(--c-border, #2a2a3d);
          border-radius: 10px;
          padding: 14px 16px;
        }
        .af-stat-label {
          font-size: 11px;
          color: var(--c-muted, #6b6b8a);
          margin-bottom: 4px;
        }
        .af-stat-value {
          font-size: 24px;
          font-weight: 700;
        }

        .af-card {
          background: var(--c-surface, #13131a);
          border: 1px solid var(--c-border, #2a2a3d);
          border-radius: 12px;
          overflow: hidden;
        }
        .af-card-title {
          padding: 14px 18px;
          border-bottom: 1px solid var(--c-border, #2a2a3d);
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--c-muted, #6b6b8a);
        }

        .af-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 13px 18px;
          border-bottom: 1px solid var(--c-border, #2a2a3d);
          transition: background 0.1s;
          cursor: default;
        }
        .af-item:last-child { border-bottom: none; }
        .af-item:hover { background: var(--c-surface2, #1c1c27); }

        .af-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          opacity: 0.9;
        }
        .af-body { flex: 1; min-width: 0; }
        .af-item-title {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .af-item-desc {
          font-size: 12px;
          color: var(--c-muted, #6b6b8a);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .af-time {
          font-size: 11px;
          color: var(--c-muted, #6b6b8a);
          flex-shrink: 0;
          padding-top: 2px;
        }

        .af-empty {
          padding: 40px;
          text-align: center;
          color: var(--c-muted, #6b6b8a);
          font-size: 13px;
        }
        .af-loading {
          padding: 40px;
          text-align: center;
          color: var(--c-muted, #6b6b8a);
          font-size: 13px;
        }
      </style>

      <div class="af-header">
        <div class="af-title">📊 Активность</div>
        <button class="af-refresh" @click=${c}>↻ Обновить</button>
      </div>

      <div class="af-stats">
        <div class="af-stat">
          <div class="af-stat-label">Событий сегодня</div>
          <div class="af-stat-value">${s.length}</div>
        </div>
        <div class="af-stat">
          <div class="af-stat-label">Сообщений</div>
          <div class="af-stat-value">${s.filter(e=>e.kind===`message`).length}</div>
        </div>
        <div class="af-stat">
          <div class="af-stat-label">Автоматизаций</div>
          <div class="af-stat-value">${s.filter(e=>e.kind===`cron`).length}</div>
        </div>
      </div>

      <div class="af-card">
        <div class="af-card-title">🔄 Лента событий</div>

        ${o?e`<div class="af-loading">Загрузка...</div>`:s.length===0?e`<div class="af-empty">Пока нет событий. Начните диалог с ботом!</div>`:s.map(a=>e`
              <div class="af-item">
                <div class="af-icon" style="background: ${r(a.kind)}22;">
                  ${n(a.kind)}
                </div>
                <div class="af-body">
                  <div class="af-item-title">${a.title}</div>
                  ${a.description?e`<div class="af-item-desc">${a.description}</div>`:t}
                </div>
                <div class="af-time">${i(a.timestamp)}</div>
              </div>
            `)}
      </div>
    </div>
  `}export{a as eventsFromSessions,o as renderActivityFeed};
//# sourceMappingURL=activity-feed-sdSxZuIj.js.map