import { html, nothing } from "lit";
import type { SessionListEntry } from "../types.ts";

export type CronJob = {
  id: string;
  name: string;
  enabled: boolean;
  nextRun?: number;
};

export type ActivityEvent = {
  id: string;
  kind: "message" | "cron" | "memory" | "connection" | "error" | "system";
  title: string;
  description?: string;
  timestamp: number;
  duration?: number; // seconds
  icon?: string;
};

export type ActivityFeedProps = {
  loading: boolean;
  events: ActivityEvent[];
  sessions: SessionListEntry[];
  cronJobs?: CronJob[];
  onRefresh: () => void;
};

function iconForKind(kind: ActivityEvent["kind"], customIcon?: string): string {
  if (customIcon) return customIcon;
  switch (kind) {
    case "message": return "💬";
    case "cron": return "⚡";
    case "memory": return "🧠";
    case "connection": return "🔌";
    case "error": return "⚠️";
    case "system": return "🔧";
    default: return "•";
  }
}

function colorForKind(kind: ActivityEvent["kind"]): string {
  switch (kind) {
    case "message": return "var(--c-accent, #6366f1)";
    case "cron": return "#eab308";
    case "memory": return "#8b5cf6";
    case "connection": return "#22c55e";
    case "error": return "#ef4444";
    case "system": return "#6b7280";
    default: return "var(--c-accent, #6366f1)";
  }
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "только что";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return "вчера";
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 60) return `${seconds}с`;
  return `${Math.round(seconds / 60)} мин`;
}

function classifySession(
  session: SessionListEntry,
  cronJobs: CronJob[],
): { kind: ActivityEvent["kind"]; title: string; description: string; icon: string } {
  const key = (session.key ?? "").toLowerCase();
  const label = session.label ?? session.key ?? "";

  if (key.includes("cron")) {
    const jobId = key.replace(/^cron[:\-_]?/, "").split(":")[0];
    const job = cronJobs.find(j => j.id === jobId || key.includes(j.id));
    return {
      kind: "cron",
      icon: "⚡",
      title: job ? job.name : "Автоматизация",
      description: job ? (job.enabled ? "Активно" : "Приостановлено") : label,
    };
  }
  if (key.includes("telegram")) {
    return {
      kind: "message",
      icon: "✈️",
      title: "Telegram",
      description: label !== key ? label : "Диалог в Telegram",
    };
  }
  if (key.includes("direct") || key.includes("web")) {
    return {
      kind: "message",
      icon: "💬",
      title: "Прямое сообщение",
      description: label !== key ? label : "Веб-чат",
    };
  }
  if (key.includes("gmail") || key.includes("email")) {
    return {
      kind: "message",
      icon: "📧",
      title: "Email",
      description: label,
    };
  }
  if (key.includes("calendar")) {
    return {
      kind: "system",
      icon: "📅",
      title: "Календарь",
      description: label,
    };
  }
  return {
    kind: "system",
    icon: "🔧",
    title: "Действие агента",
    description: label,
  };
}

// Derive activity events from sessions list, cross-referenced with cron jobs
export function eventsFromSessions(
  sessions: SessionListEntry[],
  cronJobs: CronJob[] = [],
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const session of sessions) {
    const updatedAt = session.updatedAt ?? session.createdAt ?? Date.now();
    const createdAt = session.createdAt ?? updatedAt;
    const duration = updatedAt !== createdAt
      ? Math.round((updatedAt - createdAt) / 1000)
      : 0;

    const classified = classifySession(session, cronJobs);

    events.push({
      id: session.key ?? String(Math.random()),
      kind: classified.kind,
      title: classified.title,
      description: classified.description,
      icon: classified.icon,
      timestamp: updatedAt,
      duration,
    });
  }

  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
}

export function renderActivityFeed(props: ActivityFeedProps) {
  const { loading, events, onRefresh } = props;

  // Stats: filter to today only
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  const todayEvents = events.filter(e => e.timestamp >= todayTs);
  const todayMsgs = todayEvents.filter(e => e.kind === "message").length;
  const todayAuto = todayEvents.filter(e => e.kind === "cron").length;

  return html`
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
        .af-refresh:hover { border-color: var(--c-accent, #6366f1); }

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
        .af-card-count {
          font-weight: 400;
          font-size: 11px;
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
        <button class="af-refresh" @click=${onRefresh}>↻ Обновить</button>
      </div>

      <div class="af-stats">
        <div class="af-stat">
          <div class="af-stat-label">Событий сегодня</div>
          <div class="af-stat-value">${todayEvents.length}</div>
        </div>
        <div class="af-stat">
          <div class="af-stat-label">Сообщений</div>
          <div class="af-stat-value">${todayMsgs}</div>
        </div>
        <div class="af-stat">
          <div class="af-stat-label">Автоматизаций</div>
          <div class="af-stat-value">${todayAuto}</div>
        </div>
      </div>

      <div class="af-card">
        <div class="af-card-title">
          🔄 Лента событий
          <span class="af-card-count">${events.length} всего</span>
        </div>

        ${loading
          ? html`<div class="af-loading">Загрузка...</div>`
          : events.length === 0
            ? html`<div class="af-empty">Пока нет событий. Начните диалог с ботом!</div>`
            : events.map(event => {
                const durStr = event.duration ? formatDuration(event.duration) : "";
                return html`
                  <div class="af-item">
                    <div class="af-icon" style="background: ${colorForKind(event.kind)}22;">
                      ${iconForKind(event.kind, event.icon)}
                    </div>
                    <div class="af-body">
                      <div class="af-item-title">${event.title}</div>
                      ${event.description
                        ? html`<div class="af-item-desc">
                            ${event.description}${durStr ? ` · ${durStr}` : ""}
                          </div>`
                        : nothing}
                    </div>
                    <div class="af-time">${formatTime(event.timestamp)}</div>
                  </div>
                `;
              })
        }
      </div>
    </div>
  `;
}
