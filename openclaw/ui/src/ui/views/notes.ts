import { html, LitElement, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { Marked } from "marked";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import css_ from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import sql from "highlight.js/lib/languages/sql";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import markdown from "highlight.js/lib/languages/markdown";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("css", css_);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("markdown", markdown);

const marked = new Marked({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
      let highlighted: string;
      try {
        highlighted = language !== "plaintext"
          ? hljs.highlight(text, { language }).value
          : text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      } catch {
        highlighted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      return `<pre class="hljs"><code class="language-${language}">${highlighted}</code></pre>`;
    },
  },
});

// ── Types ───────────────────────────────────────────────────────
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

interface ToolbarAction {
  label: string;
  title: string;
  prefix: string;
  suffix: string;
  block: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "B",    title: "Bold",          prefix: "**",  suffix: "**",  block: false },
  { label: "I",    title: "Italic",        prefix: "_",   suffix: "_",   block: false },
  { label: "</>",  title: "Inline code",   prefix: "`",   suffix: "`",   block: false },
  { label: "H1",   title: "Heading 1",     prefix: "# ",  suffix: "",    block: true  },
  { label: "H2",   title: "Heading 2",     prefix: "## ", suffix: "",    block: true  },
  { label: "H3",   title: "Heading 3",     prefix: "### ",suffix: "",    block: true  },
  { label: "—",    title: "Bullet list",   prefix: "- ",  suffix: "",    block: true  },
  { label: "[]",   title: "Checkbox",      prefix: "- [ ] ", suffix: "", block: true  },
  { label: "🔗",   title: "Link",          prefix: "[",   suffix: "](url)", block: false },
  { label: "```",  title: "Code block",    prefix: "```\n", suffix: "\n```", block: true },
];

// ── Component ───────────────────────────────────────────────────
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
  @state() private previewMode = false;
  @state() private renderedHtml = "";
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", sans-serif;
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
      margin: 0; font-size: 14px; font-weight: 600; color: #e6edf3;
    }
    .sidebar-search { padding: 8px 12px; }
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
    .note-list { flex: 1; overflow-y: auto; padding: 4px 8px; }
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
      font-size: 13px; font-weight: 500; color: #e6edf3;
      display: flex; align-items: center; gap: 6px;
    }
    .note-item-icon { font-size: 15px; }
    .note-item-date { font-size: 11px; color: #484f58; margin-top: 3px; }

    /* ── Editor area ── */
    .editor-area {
      flex: 1; display: flex; flex-direction: column; overflow: hidden;
    }
    .editor-empty {
      flex: 1; display: flex; align-items: center; justify-content: center;
      color: #484f58; font-size: 14px; flex-direction: column; gap: 12px;
    }

    /* ── Toolbar row (save indicator + AI + mode toggle) ── */
    .editor-toolbar {
      display: flex; align-items: center;
      padding: 10px 28px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      gap: 8px; flex-shrink: 0;
    }
    .save-indicator {
      font-size: 11px; color: #484f58; margin-left: auto;
    }
    .save-indicator.saving { color: #d29922; }

    /* ── Markdown formatting toolbar ── */
    .md-toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 28px 6px 40px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .md-btn {
      background: transparent;
      border: none;
      color: #6e7681;
      cursor: pointer;
      font-size: 12px;
      font-family: "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      transition: color 0.12s, background 0.12s;
      white-space: nowrap;
    }
    .md-btn:hover {
      color: #c9d1d9;
      background: rgba(255,255,255,0.06);
    }
    .md-sep {
      width: 1px;
      height: 16px;
      background: rgba(255,255,255,0.06);
      margin: 0 4px;
    }

    /* ── Editor body ── */
    .editor-body {
      flex: 1; overflow-y: auto; padding: 28px 40px 60px; max-width: 780px;
    }
    .editor-title {
      font-size: 32px; font-weight: 700; color: #e6edf3; border: none;
      background: transparent; outline: none; width: 100%;
      font-family: inherit; padding: 0; margin-bottom: 8px;
      line-height: 1.3; letter-spacing: -0.02em;
    }
    .editor-title::placeholder { color: #30363d; }
    .editor-tags-row {
      display: flex; align-items: center; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
    }
    .editor-tags-row input {
      background: transparent; border: none; color: #8b949e;
      font-size: 12px; outline: none; min-width: 120px;
      font-family: inherit; padding: 2px 0;
    }
    .editor-tags-row input::placeholder { color: #30363d; }
    .tag-pill {
      font-size: 11px; font-weight: 500; padding: 2px 10px;
      border-radius: 12px; color: #fff;
    }
    .editor-content {
      width: 100%; min-height: 400px; background: transparent;
      border: none; color: #c9d1d9; font-size: 15px;
      font-family: "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      line-height: 1.7; outline: none; resize: none; padding: 0;
      tab-size: 2;
    }
    .editor-content::placeholder { color: #30363d; }

    /* ── Markdown preview ── */
    .md-preview {
      font-size: 15px;
      line-height: 1.7;
      color: #c9d1d9;
      min-height: 400px;
    }
    .md-preview h1 {
      font-size: 28px; font-weight: 700; color: #e6edf3;
      margin: 24px 0 12px; padding-bottom: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .md-preview h2 {
      font-size: 22px; font-weight: 600; color: #e6edf3;
      margin: 20px 0 10px; padding-bottom: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .md-preview h3 {
      font-size: 18px; font-weight: 600; color: #e6edf3;
      margin: 16px 0 8px;
    }
    .md-preview h4, .md-preview h5, .md-preview h6 {
      font-size: 15px; font-weight: 600; color: #e6edf3;
      margin: 14px 0 6px;
    }
    .md-preview p { margin: 0 0 12px; }
    .md-preview a { color: #a78bfa; text-decoration: none; }
    .md-preview a:hover { text-decoration: underline; }
    .md-preview strong { color: #e6edf3; font-weight: 600; }
    .md-preview em { font-style: italic; }
    .md-preview blockquote {
      border-left: 3px solid #7c3aed;
      margin: 12px 0;
      padding: 4px 16px;
      color: #8b949e;
      background: rgba(124,58,237,0.06);
      border-radius: 0 6px 6px 0;
    }
    .md-preview ul, .md-preview ol {
      margin: 0 0 12px; padding-left: 24px;
    }
    .md-preview li { margin-bottom: 4px; }
    .md-preview li input[type="checkbox"] {
      margin-right: 6px;
      accent-color: #7c3aed;
    }
    .md-preview code {
      font-family: "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em;
      background: rgba(255,255,255,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      color: #e6edf3;
    }
    .md-preview pre.hljs {
      background: #161b22;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 16px 18px;
      margin: 12px 0;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
    }
    .md-preview pre.hljs code {
      background: transparent;
      padding: 0;
      font-size: inherit;
      color: #c9d1d9;
    }
    .md-preview table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    .md-preview th, .md-preview td {
      border: 1px solid rgba(255,255,255,0.08);
      padding: 8px 12px;
      text-align: left;
    }
    .md-preview th {
      background: rgba(255,255,255,0.04);
      font-weight: 600;
      color: #e6edf3;
    }
    .md-preview hr {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.08);
      margin: 20px 0;
    }
    .md-preview img {
      max-width: 100%;
      border-radius: 8px;
    }

    /* ── highlight.js token colors (GitHub-dark inspired) ── */
    .hljs { color: #c9d1d9; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #ff7b72; }
    .hljs-string, .hljs-attr { color: #a5d6ff; }
    .hljs-number, .hljs-literal { color: #79c0ff; }
    .hljs-function, .hljs-title { color: #d2a8ff; }
    .hljs-comment, .hljs-quote { color: #8b949e; font-style: italic; }
    .hljs-type, .hljs-class { color: #ffa657; }
    .hljs-variable, .hljs-template-variable { color: #ffa657; }
    .hljs-params { color: #c9d1d9; }
    .hljs-regexp { color: #7ee787; }
    .hljs-meta { color: #79c0ff; }
    .hljs-tag { color: #7ee787; }
    .hljs-name { color: #7ee787; }
    .hljs-symbol, .hljs-bullet { color: #ffa657; }
    .hljs-addition { color: #aff5b4; background: rgba(63,185,80,0.15); }
    .hljs-deletion { color: #ffdcd7; background: rgba(248,81,73,0.15); }

    /* ── Buttons ── */
    .btn {
      border: none; border-radius: 8px; cursor: pointer;
      font-size: 13px; font-weight: 500; font-family: inherit;
      transition: all 0.15s; white-space: nowrap;
    }
    .btn-primary { background: #7c3aed; color: #fff; padding: 7px 14px; }
    .btn-primary:hover { background: #6d28d9; }
    .btn-secondary {
      background: rgba(255,255,255,0.06); color: #c9d1d9;
      padding: 7px 12px; border: 1px solid rgba(255,255,255,0.08);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.1); }
    .btn-secondary.active {
      background: rgba(124,58,237,0.15); color: #a78bfa;
      border-color: rgba(124,58,237,0.3);
    }
    .btn-ghost { background: transparent; color: #484f58; padding: 5px 8px; }
    .btn-ghost:hover { color: #c9d1d9; background: rgba(255,255,255,0.06); }
    .btn-danger { background: #da3633; color: #fff; padding: 8px 16px; }
    .btn-danger:hover { background: #b62324; }
    .btn-sm { font-size: 12px; padding: 4px 8px; border-radius: 6px; }
    .btn-amber {
      background: rgba(210,153,34,0.15); color: #d29922;
      padding: 6px 12px; border: 1px solid rgba(210,153,34,0.2);
    }
    .btn-amber:hover { background: rgba(210,153,34,0.25); }

    /* ── Overlay / dialogs ── */
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; backdrop-filter: blur(6px);
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
    .confirm {
      background: #161b22; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 28px; width: 360px; text-align: center;
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

    /* ── Mode toggle ── */
    .mode-toggle {
      display: inline-flex;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .mode-toggle button {
      background: transparent;
      border: none;
      color: #6e7681;
      font-size: 12px;
      font-weight: 500;
      font-family: inherit;
      padding: 5px 14px;
      cursor: pointer;
      transition: all 0.12s;
    }
    .mode-toggle button:hover { color: #c9d1d9; }
    .mode-toggle button.active {
      background: rgba(124,58,237,0.15);
      color: #a78bfa;
    }
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

  // ── API ───────────────────────────────────────────────────
  private async _loadNotes() {
    this.loading = true;
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.notes = data.notes || [];
    } catch (e) { this.error = `Failed to load notes: ${e}`; }
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
      this.previewMode = false;
      this._renderMarkdown();
    } catch (e) { this.error = `Failed to open note: ${e}`; }
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
    } catch (e) { this.error = `Failed to create note: ${e}`; }
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
        body: JSON.stringify({ title: this.editTitle, content: this.editContent, tags }),
      });
      const idx = this.notes.findIndex((n) => n.id === this.activeNote!.id);
      if (idx >= 0) {
        this.notes = this.notes.map((n, i) =>
          i === idx ? { ...n, title: this.editTitle, tags, updatedAt: new Date().toISOString() } : n
        );
      }
    } catch { /* silent */ }
    this.saving = false;
  }

  private async _deleteNote(id: string) {
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      this.confirmDeleteId = null;
      if (this.activeNote?.id === id) this.activeNote = null;
      await this._loadNotes();
      this._toast("Note deleted");
    } catch (e) { this.error = `Failed to delete: ${e}`; }
  }

  private async _summarize() {
    if (!this.activeNote) return;
    try {
      const res = await fetch(`${API}/${this.activeNote.id}/summarize`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._toast(`Summary: ${data.summary}`);
    } catch (e) { this._toast(`Summarize failed: ${e}`); }
  }

  // ── Markdown ──────────────────────────────────────────────
  private _renderMarkdown() {
    try {
      this.renderedHtml = marked.parse(this.editContent) as string;
    } catch {
      this.renderedHtml = this.editContent
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }

  private _insertMarkdown(action: ToolbarAction) {
    const textarea = this.shadowRoot?.querySelector(".editor-content") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = this.editContent;
    const selected = text.substring(start, end);

    let insert: string;
    let cursorOffset: number;

    if (action.block && !selected) {
      // Block-level: insert at line start
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const before = text.substring(0, lineStart);
      const after = text.substring(lineStart);
      insert = action.prefix;
      this.editContent = before + insert + after + action.suffix;
      cursorOffset = lineStart + insert.length;
    } else if (selected) {
      // Wrap selection
      const replacement = action.prefix + selected + action.suffix;
      this.editContent = text.substring(0, start) + replacement + text.substring(end);
      cursorOffset = start + replacement.length;
    } else {
      // Insert at cursor with placeholder
      const placeholder = "text";
      const replacement = action.prefix + placeholder + action.suffix;
      this.editContent = text.substring(0, start) + replacement + text.substring(end);
      cursorOffset = start + action.prefix.length;
    }

    this._scheduleAutoSave();
    this._renderMarkdown();

    // Restore cursor
    this.updateComplete.then(() => {
      textarea.focus();
      const pos = cursorOffset;
      textarea.setSelectionRange(pos, pos);
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  private _filteredNotes(): NoteSummary[] {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.notes;
    return this.notes.filter((n) => n.title.toLowerCase().includes(q));
  }

  private _fmtDate(iso: string): string {
    try {
      const d = new Date(iso);
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return ""; }
  }

  // ── Render ────────────────────────────────────────────────
  render() {
    if (this.loading) {
      return html`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#484f58">Loading\u2026</div>`;
    }

    return html`
      <div class="root">
        <div class="sidebar">
          <div class="sidebar-head">
            <h3>Notes</h3>
            <button class="btn btn-ghost btn-sm" @click=${() => this._createNote()}>+ New</button>
          </div>
          <div class="sidebar-search">
            <input type="text" placeholder="Search notes\u2026"
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
        <div style="font-size:40px;opacity:0.3">\uD83D\uDCDD</div>
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
        <div class="mode-toggle">
          <button class="${!this.previewMode ? "active" : ""}"
            @click=${() => { this.previewMode = false; }}>Edit</button>
          <button class="${this.previewMode ? "active" : ""}"
            @click=${() => { this._renderMarkdown(); this.previewMode = true; }}>Preview</button>
        </div>
        <button class="btn btn-amber btn-sm" @click=${() => this._summarize()}>AI Summary</button>
        <button class="btn btn-ghost btn-sm" style="color:#da3633"
          @click=${() => { this.confirmDeleteId = note.id; }}>Delete</button>
        <span class="save-indicator ${this.saving ? "saving" : ""}">
          ${this.saving ? "Saving\u2026" : "Saved"}
        </span>
      </div>

      ${!this.previewMode ? html`
        <div class="md-toolbar">
          ${TOOLBAR_ACTIONS.map((a, i) => html`
            ${i === 3 || i === 6 || i === 9 ? html`<div class="md-sep"></div>` : nothing}
            <button class="md-btn" title=${a.title}
              @click=${() => this._insertMarkdown(a)}>${a.label}</button>
          `)}
        </div>
      ` : nothing}

      <div class="editor-body">
        <input class="editor-title" type="text" placeholder="Untitled"
          .value=${this.editTitle}
          @input=${(e: Event) => {
            this.editTitle = (e.target as HTMLInputElement).value;
            this._scheduleAutoSave();
          }}
        />
        <div class="editor-tags-row">
          ${tags.map((t) => html`<span class="tag-pill" style="background:${tagColor(t)}">${t}</span>`)}
          <input type="text" placeholder="Add tags (comma-separated)\u2026"
            .value=${this.editTags}
            @input=${(e: Event) => {
              this.editTags = (e.target as HTMLInputElement).value;
              this._scheduleAutoSave();
            }}
          />
        </div>

        ${this.previewMode
          ? html`<div class="md-preview">${unsafeHTML(this.renderedHtml)}</div>`
          : html`
            <textarea class="editor-content" placeholder="Start writing in Markdown\u2026"
              .value=${this.editContent}
              @input=${(e: Event) => {
                this.editContent = (e.target as HTMLTextAreaElement).value;
                this._scheduleAutoSave();
                this._renderMarkdown();
              }}
              @keydown=${(e: KeyboardEvent) => {
                // Tab inserts 2 spaces instead of switching focus
                if (e.key === "Tab") {
                  e.preventDefault();
                  const ta = e.target as HTMLTextAreaElement;
                  const s = ta.selectionStart;
                  const end = ta.selectionEnd;
                  this.editContent = this.editContent.substring(0, s) + "  " + this.editContent.substring(end);
                  this.updateComplete.then(() => { ta.setSelectionRange(s + 2, s + 2); });
                }
              }}
            ></textarea>
          `}
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
