import { html, LitElement, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

interface Note {
  id: string;
  title: string;
  icon: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NoteSummary {
  id: string;
  title: string;
  icon: string;
  updatedAt: string;
  createdAt: string;
  tags: string[];
}

const API = "/api/notes";
const TAG_PALETTE = [
  "#7c3aed","#2563eb","#059669","#d97706","#dc2626",
  "#db2777","#4f46e5","#0891b2","#65a30d","#ea580c",
];
function tagColor(t: string): string {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = ((h << 5) - h + t.charCodeAt(i)) | 0;
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}

@customElement("notes-view")
export class NotesView extends LitElement {
  @state() private notes: NoteSummary[] = [];
  @state() private activeNote: Note | null = null;
  @state() private loading = true;
  @state() private saving = false;
  @state() private error: string | null = null;
  @state() private searchQuery = "";
  @state() private editTitle = "";
  @state() private editContent = "";
  @state() private editTags = "";
  @state() private toastMsg = "";
  @state() private toastVisible = false;
  @state() private confirmDeleteId: string | null = null;
  private _saveTimer: number | null = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      color: #c9d1d9;
      -webkit-font-smoothing: antialiased;
    }
    .root {
      display: flex;
      height: 100%;
      background: #0d1117;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 260px;
      min-width: 260px;
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      background: #010409;
    }
    .sidebar-head {
      padding: 16px 16px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .sidebar-head h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #e6edf3;
    }
    .sidebar-search {
      padding: 8px 12px;
    }
    .sidebar-search input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 7px 10px;
      color: #c9d1d9;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }
    .sidebar-search input:focus { border-color: rgba(124,58,237,0.5); }
    .sidebar-search input::placeholder { color: #484f58; }
    .note-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px;
    }
    .note-item {
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.12s;
      margin-bottom: 2px;
    }
    .note-item:hover { background: rgba(255,255,255,0.04); }
    .note-item.active { background: rgba(124,58,237,0.12); }
    .note-item-title {
      font-size: 13px;
      font-weight: 500;
      color: #e6edf3;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .note-item-icon { font-size: 15px; }
    .note-item-date {
      font-size: 11px;
      color: #484f58;
      margin-top: 3px;
    }

    /* ── Editor area ── */
    .editor-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .editor-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #484f58;
      font-size: 14px;
      flex-direction: column;
      gap: 12px;
    }
    .editor-toolbar {
      display: flex;
      align-items: center;
      padding: 12px 28px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      gap: 8px;
      flex-shrink: 0;
    }
    .editor-toolbar .save-indicator {
      font-size: 11px;
      color: #484f58;
      margin-left: auto;
    }
    .editor-toolbar .save-indicator.saving { color: #d29922; }
    .editor-body {
      flex: 1;
      overflow-y: auto;
      padding: 28px 40px 60px;
      max-width: 780px;
    }
    .editor-title {
      font-size: 32px;
      font-weight: 700;
      color: #e6edf3;
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-family: inherit;
      padding: 0;
      margin-bottom: 8px;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }
    .editor-title::placeholder { color: #30363d; }
    .editor-tags-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .editor-tags-row input {
      background: transparent;
      border: none;
      color: #8b949e;
      font-size: 12px;
      outline: none;
      min-width: 120px;
      font-family: inherit;
      padding: 2px 0;
    }
    .editor-tags-row input::placeholder { color: #30363d; }
    .tag-pill {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 10px;
      border-radius: 12px;
      color: #fff;
    }
    .editor-content {
      width: 100%;
      min-height: 400px;
      background: transparent;
      border: none;
      color: #c9d1d9;
      font-size: 15px;
      font-family: inherit;
      line-height: 1.7;
      outline: none;
      resize: none;
      padding: 0;
    }
    .editor-content::placeholder { color: #30363d; }

    /* ── Buttons ── */
    .btn {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .btn-primary { background: #7c3aed; color: #fff; padding: 7px 14px; }
    .btn-primary:hover { background: #6d28d9; }
    .btn-secondary {
      background: rgba(255,255,255,0.06);
      color: #c9d1d9;
      padding: 7px 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.1); }
    .btn-ghost { background: transparent; color: #484f58; padding: 5px 8px; }
    .btn-ghost:hover { color: #c9d1d9; background: rgba(255,255,255,0.06); }
    .btn-danger { background: #da3633; color: #fff; padding: 8px 16px; }
    .btn-danger:hover { background: #b62324; }
    .btn-sm { font-size: 12px; padding: 4px 8px; border-radius: 6px; }
    .btn-amber {
      background: rgba(210,153,34,0.15);
      color: #d29922;
      padding: 6px 12px;
      border: 1px solid rgba(210,153,34,0.2);
    }
    .btn-amber:hover { background: rgba(210,153,34,0.25); }

    /* ── Overlay ── */
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; backdrop-filter: blur(6px);
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .confirm {
      background: #161b22;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 28px; width: 360px; text-align: center;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    }
    .confirm p { color: #c9d1d9; font-size: 14px; margin: 0 0 20px; line-height: 1.5; }
    .confirm-btns { display: flex; gap: 8px; justify-content: center; }

    .toast {
      position: fixed; bottom: 28px; right: 28px;
      background: #161b22; border: 1px solid rgba(124,58,237,0.3);
      border-radius: 12px; padding: 14px 22px;
      color: #c9d1d9; font-size: 13px; z-index: 10001;
      box-shadow: 0 8px 40px rgba(0,0,0,0.4);
      animation: toastIn 0.25s ease-out;
    }
    @keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  `;

  connectedCallback() {
    super.connectedCallback();
    this._loadNotes();
  }

  private _toast(msg: string) {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 2500);
  }

  private async _loadNotes() {
    this.loading = true;
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.notes = data.notes || [];
    } catch (e) {
      this.error = `Failed to load notes: ${e}`;
    }
    this.loading = false;
  }

  private async _openNote(id: string) {
    try {
      const res = await fetch(`${API}/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const note: Note = await res.json();
      this.activeNote = note;
      this.editTitle = note.title;
      this.editContent = note.content;
      this.editTags = (note.tags || []).join(", ");
    } catch (e) {
      this.error = `Failed to open note: ${e}`;
    }
  }

  private async _createNote() {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", content: "", tags: [] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const note: Note = await res.json();
      await this._loadNotes();
      this._openNote(note.id);
    } catch (e) {
      this.error = `Failed to create note: ${e}`;
    }
  }

  private _scheduleAutoSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = window.setTimeout(() => this._saveNote(), 800);
  }

  private async _saveNote() {
    if (!this.activeNote) return;
    this.saving = true;
    try {
      const tags = this.editTags.split(",").map((t) => t.trim()).filter(Boolean);
      await fetch(`${API}/${this.activeNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: this.editTitle,
          content: this.editContent,
          tags,
        }),
      });
      // Update sidebar without full reload
      const idx = this.notes.findIndex((n) => n.id === this.activeNote!.id);
      if (idx >= 0) {
        this.notes = this.notes.map((n, i) =>
          i === idx ? { ...n, title: this.editTitle, tags, updatedAt: new Date().toISOString() } : n
        );
      }
    } catch {
      // silent fail for autosave
    }
    this.saving = false;
  }

  private async _deleteNote(id: string) {
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      this.confirmDeleteId = null;
      if (this.activeNote?.id === id) this.activeNote = null;
      await this._loadNotes();
      this._toast("Note deleted");
    } catch (e) {
      this.error = `Failed to delete: ${e}`;
    }
  }

  private async _summarize() {
    if (!this.activeNote) return;
    try {
      const res = await fetch(`${API}/${this.activeNote.id}/summarize`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._toast(`Summary: ${data.summary}`);
    } catch (e) {
      this._toast(`Summarize failed: ${e}`);
    }
  }

  private _filteredNotes(): NoteSummary[] {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.notes;
    return this.notes.filter((n) => n.title.toLowerCase().includes(q));
  }

  private _fmtDate(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return ""; }
  }

  render() {
    if (this.loading) return html`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#484f58">Loading…</div>`;

    return html`
      <div class="root">
        <div class="sidebar">
          <div class="sidebar-head">
            <h3>Notes</h3>
            <button class="btn btn-ghost btn-sm" @click=${() => this._createNote()}>+ New</button>
          </div>
          <div class="sidebar-search">
            <input type="text" placeholder="Search notes…"
              .value=${this.searchQuery}
              @input=${(e: Event) => { this.searchQuery = (e.target as HTMLInputElement).value; }}
            />
          </div>
          <div class="note-list">
            ${this._filteredNotes().map((n) => html`
              <div class="note-item ${this.activeNote?.id === n.id ? "active" : ""}"
                @click=${() => this._openNote(n.id)}>
                <div class="note-item-title">
                  ${n.icon ? html`<span class="note-item-icon">${n.icon}</span>` : nothing}
                  ${n.title || "Untitled"}
                </div>
                <div class="note-item-date">${this._fmtDate(n.updatedAt)}</div>
              </div>
            `)}
            ${this._filteredNotes().length === 0 ? html`
              <div style="text-align:center;padding:20px;color:#484f58;font-size:13px">
                ${this.searchQuery ? "No matching notes" : "No notes yet"}
              </div>
            ` : nothing}
          </div>
        </div>

        <div class="editor-area">
          ${this.activeNote ? this._renderEditor() : this._renderEmpty()}
        </div>
      </div>

      ${this.confirmDeleteId ? this._renderConfirmDelete() : nothing}
      ${this.toastVisible ? html`<div class="toast">${this.toastMsg}</div>` : nothing}
    `;
  }

  private _renderEmpty() {
    return html`
      <div class="editor-empty">
        <div style="font-size:40px;opacity:0.3">📝</div>
        <div>Select a note or create a new one</div>
        <button class="btn btn-primary" @click=${() => this._createNote()}>+ New Note</button>
      </div>
    `;
  }

  private _renderEditor() {
    const note = this.activeNote!;
    const tags = this.editTags.split(",").map((t) => t.trim()).filter(Boolean);

    return html`
      <div class="editor-toolbar">
        <button class="btn btn-amber btn-sm" @click=${() => this._summarize()}>AI Summary</button>
        <button class="btn btn-ghost btn-sm" style="color:#da3633"
          @click=${() => { this.confirmDeleteId = note.id; }}>Delete</button>
        <span class="save-indicator ${this.saving ? "saving" : ""}">
          ${this.saving ? "Saving…" : "Saved"}
        </span>
      </div>
      <div class="editor-body">
        <input class="editor-title" type="text"
          placeholder="Untitled"
          .value=${this.editTitle}
          @input=${(e: Event) => {
            this.editTitle = (e.target as HTMLInputElement).value;
            this._scheduleAutoSave();
          }}
        />
        <div class="editor-tags-row">
          ${tags.map((t) => html`<span class="tag-pill" style="background:${tagColor(t)}">${t}</span>`)}
          <input type="text" placeholder="Add tags (comma-separated)…"
            .value=${this.editTags}
            @input=${(e: Event) => {
              this.editTags = (e.target as HTMLInputElement).value;
              this._scheduleAutoSave();
            }}
          />
        </div>
        <textarea class="editor-content"
          placeholder="Start writing…"
          .value=${this.editContent}
          @input=${(e: Event) => {
            this.editContent = (e.target as HTMLTextAreaElement).value;
            this._scheduleAutoSave();
          }}
        ></textarea>
      </div>
    `;
  }

  private _renderConfirmDelete() {
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.confirmDeleteId = null; }}>
        <div class="confirm">
          <p>Delete this note permanently?</p>
          <div class="confirm-btns">
            <button class="btn btn-secondary" @click=${() => { this.confirmDeleteId = null; }}>Cancel</button>
            <button class="btn btn-danger" @click=${() => this._deleteNote(this.confirmDeleteId!)}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }
}

export function renderNotes() {
  return html`<notes-view></notes-view>`;
}
