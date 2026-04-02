import { html, LitElement, css } from "lit";
import { customElement, state } from "lit/decorators.js";

@customElement("appflowy-embed-view")
export class AppFlowyEmbedView extends LitElement {
  @state() private ready = false;
  @state() private error: string | null = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .embed-root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .embed-iframe {
      flex: 1;
      width: 100%;
      border: none;
      background: var(--oc-color-bg-1, #13131a);
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--oc-color-text-2, #888);
      font-size: 14px;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    try {
      const res = await fetch("/appflowy/gotrue/token?grant_type=anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        // Fallback: try signup endpoint
        const res2 = await fetch("/appflowy/gotrue/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data2 = await res2.json();
        if (data2.access_token) {
          this._storeToken(data2);
        }
      } else {
        const data = await res.json();
        if (data.access_token) {
          this._storeToken(data);
        }
      }
    } catch (e) {
      console.warn("AppFlowy anon login failed", e);
      this.error = String(e);
    }
    this.ready = true;
  }

  private _storeToken(data: { access_token: string; refresh_token?: string; expires_at?: number }) {
    try {
      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({
          currentSession: {
            access_token: data.access_token,
            token_type: "bearer",
            refresh_token: data.refresh_token ?? "",
          },
          expiresAt: data.expires_at ?? 9999999999,
        })
      );
    } catch (e) {
      console.warn("Failed to store AppFlowy token", e);
    }
  }

  render() {
    if (!this.ready) {
      return html`<div class="loading">Loading AppFlowy\u2026</div>`;
    }
    return html`
      <div class="embed-root">
        <iframe
          class="embed-iframe"
          src="/tasks"
          allow="clipboard-read; clipboard-write"
          loading="lazy"
        ></iframe>
      </div>
    `;
  }
}

export function renderAppFlowyEmbed() {
  return html`<appflowy-embed-view></appflowy-embed-view>`;
}
