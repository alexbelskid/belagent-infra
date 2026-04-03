import { html, LitElement, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

// ── Types ───────────────────────────────────────────────────────
interface KanbanColumn {
  id: string;
  title: string;
  order: number;
}

interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "mid" | "high";
  deadline: string | null;
  tags: string[];
  createdAt: string;
  order: number;
  archived: boolean;
}

interface KanbanBoard {
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

interface CardFormData {
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "mid" | "high";
  deadline: string;
  tags: string;
  columnId: string;
}

const API = "/api/kanban";
const PRIORITY_LABELS: Record<string, string> = { low: "Low", mid: "Mid", high: "High" };
const PRIORITY_ORDER: Record<string, number> = { high: 0, mid: 1, low: 2 };

const TAG_PALETTE = [
  "#C8001E", "#8A8A8A", "#E06070", "#666666", "#A0001A",
  "#707070", "#404040", "#B0B0B0", "#D04040", "#E00022",
];

function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = ((h << 5) - h + tag.charCodeAt(i)) | 0;
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}

function deadlineStatus(deadline: string | null): "none" | "overdue" | "soon" | "ok" {
  if (!deadline) return "none";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = new Date(deadline + "T00:00:00");
  const diff = (dl.getTime() - now.getTime()) / 86400000;
  if (diff < 0) return "overdue";
  if (diff <= 1) return "soon";
  return "ok";
}

// ── Component ───────────────────────────────────────────────────
@customElement("kanban-board-view")
export class KanbanBoardView extends LitElement {
  @state() private columns: KanbanColumn[] = [];
  @state() private cards: KanbanCard[] = [];
  @state() private loading = true;
  @state() private error: string | null = null;

  @state() private modalOpen = false;
  @state() private editingCard: KanbanCard | null = null;
  @state() private formData: CardFormData = {
    title: "", description: "", assignee: "", priority: "mid",
    deadline: "", tags: "", columnId: "",
  };

  @state() private addingColumn = false;
  @state() private newColumnTitle = "";

  @state() private dragCardId: string | null = null;
  @state() private dragOverColumnId: string | null = null;
  @state() private dragOverIndex: number | null = null;

  @state() private confirmArchiveCardId: string | null = null;
  @state() private confirmDeleteColumnId: string | null = null;

  @state() private searchQuery = "";
  @state() private filterAssignee = "";
  @state() private filterTag = "";
  @state() private sortByPriority = false;

  @state() private showArchive = false;
  @state() private archivedCards: KanbanCard[] = [];

  @state() private toastMsg = "";
  @state() private toastVisible = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      color: #F0F0F0;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Root ── */
    .root {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0D0D0D;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      padding: 16px 28px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      gap: 16px;
      flex-shrink: 0;
      flex-wrap: wrap;
      background: #0D0D0D;
    }
    .header h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: #F5F5F5;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .t-input {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 12px;
      color: #F0F0F0;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      width: 200px; min-width: 200px;
      transition: border-color 0.2s, background 0.2s;
    }
    .t-input:focus {
      border-color: rgba(200, 0, 30, 0.5);
      background: rgba(255, 255, 255, 0.06);
    }
    .t-input::placeholder { color: #666666; }
    .t-select {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 12px;
      color: #F0F0F0;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      max-width: 150px;
    }

    /* ── Buttons ── */
    .btn {
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-primary {
      background: #C8001E;
      color: #fff;
      padding: 8px 14px;
    }
    .btn-primary:hover { background: #A0001A; }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #F0F0F0;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.14);
    }
    .btn-secondary.active {
      background: rgba(200, 0, 30, 0.15);
      color: #C8001E;
      border-color: rgba(200, 0, 30, 0.3);
    }
    .btn-ghost {
      background: transparent;
      color: #666666;
      padding: 5px 8px;
    }
    .btn-ghost:hover { color: #F0F0F0; background: rgba(255,255,255,0.06); }
    .btn-danger { background: #C8001E; color: #fff; padding: 8px 16px; }
    .btn-danger:hover { background: #A0001A; }
    .btn-amber {
      background: rgba(200, 0, 30, 0.15);
      color: #C8001E;
      padding: 8px 12px;
      border: 1px solid rgba(200, 0, 30, 0.2);
    }
    .btn-amber:hover {
      background: rgba(200, 0, 30, 0.25);
    }
    .btn-sm { font-size: 12px; padding: 4px 8px; border-radius: 6px; }

    /* ── Board ── */
    .board {
      display: flex;
      gap: 20px;
      padding: 24px 28px;
      overflow-x: auto;
      flex: 1;
      align-items: flex-start;
    }

    /* ── Column ── */
    .col {
      width: 300px;
      min-width: 300px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      max-height: 100%;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: border-color 0.2s ease;
    }
    .col.drag-over {
      border-color: rgba(200, 0, 30, 0.4);
      background: rgba(200, 0, 30, 0.03);
    }
    .col-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 12px;
    }
    .col-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #8A8A8A;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .col-count {
      background: rgba(255, 255, 255, 0.06);
      color: #8A8A8A;
      font-size: 11px;
      min-width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-weight: 500;
    }
    .col-body {
      padding: 4px 10px 8px;
      overflow-y: auto;
      flex: 1;
      min-height: 48px;
    }
    .col-foot {
      padding: 6px 10px 10px;
    }
    .add-card-btn {
      width: 100%;
      background: transparent;
      border: none;
      color: #666666;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      text-align: left;
      transition: color 0.15s, background 0.15s;
    }
    .add-card-btn:hover {
      color: #F0F0F0;
      background: rgba(255, 255, 255, 0.04);
    }

    /* ── Card ── */
    .card {
      background: #1A1A1A;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 8px;
      cursor: grab;
      user-select: none;
      transition: transform 0.15s ease, box-shadow 0.2s ease,
        border-color 0.15s ease, opacity 0.15s ease;
    }
    .card:hover {
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      transform: translateY(-1px);
    }
    .card:active { cursor: grabbing; }
    .card.dragging {
      opacity: 0.35;
      transform: scale(0.96);
      box-shadow: none;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .card-title {
      font-size: 14px;
      font-weight: 500;
      color: #F5F5F5;
      line-height: 1.45;
      flex: 1;
    }
    .card-actions {
      display: flex;
      gap: 1px;
      opacity: 0;
      transition: opacity 0.12s;
      flex-shrink: 0;
      margin: -2px -4px 0 0;
    }
    .card:hover .card-actions { opacity: 1; }
    .card-action-btn {
      background: transparent;
      border: none;
      color: #666666;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 12px;
      transition: color 0.12s, background 0.12s;
    }
    .card-action-btn:hover {
      color: #F0F0F0;
      background: rgba(255, 255, 255, 0.08);
    }
    .card-action-btn.archive-btn:hover {
      color: #C8001E;
    }
    .card-desc {
      font-size: 12px;
      color: #8A8A8A;
      margin-top: 6px;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    .card-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
      color: #fff;
      opacity: 0.85;
    }
    .card-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    /* Priority dot + label */
    .priority-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      color: #8A8A8A;
    }
    .priority-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .priority-dot.high { background: #C8001E; }
    .priority-dot.mid { background: #8A8A8A; }
    .priority-dot.low { background: #555555; }
    .card-assignee {
      font-size: 11px;
      color: #C8001E;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90px;
    }
    .card-date {
      font-size: 11px;
      color: #666666;
      margin-left: auto;
    }
    .card-deadline {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 8px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .card-deadline.overdue { background: rgba(200, 0, 30, 0.15); color: #C8001E; }
    .card-deadline.soon { background: rgba(138, 138, 138, 0.15); color: #8A8A8A; }
    .card-deadline.ok { background: rgba(255, 255, 255, 0.04); color: #8A8A8A; }

    .drop-zone {
      height: 3px;
      background: #C8001E;
      border-radius: 2px;
      margin: 4px 6px;
      opacity: 0.7;
    }

    /* ── Add column ── */
    .add-col {
      width: 300px;
      min-width: 300px;
      flex-shrink: 0;
    }
    .add-col-trigger {
      width: 100%;
      background: transparent;
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #666666;
      padding: 24px 20px;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s, color 0.2s;
      text-align: center;
    }
    .add-col-trigger:hover {
      border-color: rgba(200, 0, 30, 0.3);
      color: #C8001E;
    }
    .add-col-form {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .add-col-form input {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 9px 12px;
      color: #F0F0F0;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }
    .add-col-form input:focus { border-color: rgba(200, 0, 30, 0.5); }

    /* ── Modal ── */
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(6px);
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal {
      background: #1A1A1A;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 28px;
      width: 480px;
      max-width: 92vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
      animation: modalIn 0.2s ease;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.97) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal h3 {
      margin: 0 0 24px;
      font-size: 17px;
      font-weight: 600;
      color: #F5F5F5;
      letter-spacing: -0.01em;
    }
    .fg { margin-bottom: 16px; }
    .fg label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #8A8A8A;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .fg input, .fg textarea, .fg select {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 14px;
      color: #F0F0F0;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .fg input:focus, .fg textarea:focus, .fg select:focus {
      border-color: rgba(200, 0, 30, 0.5);
    }
    .fg textarea { resize: vertical; min-height: 80px; }
    .fg select { cursor: pointer; }
    .fg .hint { font-size: 11px; color: #666666; margin-top: 4px; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
    }

    /* ── Confirm dialog ── */
    .confirm {
      background: #1A1A1A;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 28px;
      width: 360px;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
    }
    .confirm p {
      color: #F0F0F0;
      font-size: 14px;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .confirm-btns {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    /* ── Archive view ── */
    .archive {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0D0D0D;
    }
    .archive-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 28px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .archive-head h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      color: #F5F5F5;
    }
    .archive-grid {
      padding: 24px 28px;
      overflow-y: auto;
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
      align-content: start;
    }
    .archive-card {
      background: #1A1A1A;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 16px;
    }

    /* ── Toast ── */
    .toast {
      position: fixed;
      bottom: 28px;
      right: 28px;
      background: #1A1A1A;
      border: 1px solid rgba(200, 0, 30, 0.3);
      border-radius: 12px;
      padding: 14px 22px;
      color: #F0F0F0;
      font-size: 13px;
      z-index: 10001;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
      animation: toastIn 0.25s ease-out;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .center-msg {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666666;
      font-size: 14px;
    }

    /* ── Inline row helper ── */
    .row { display: flex; gap: 12px; }
    .row > * { flex: 1; }
  `;

  // ── Lifecycle ─────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this._loadBoard();
  }

  private _showToast(msg: string) {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 2500);
  }

  // ── API ───────────────────────────────────────────────────
  private async _loadBoard() {
    this.loading = true;
    this.error = null;
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const board: KanbanBoard = await res.json();
      this.columns = [...board.columns].sort((a, b) => a.order - b.order);
      this.cards = board.cards.map((c) => ({
        ...c,
        deadline: c.deadline ?? null,
        tags: Array.isArray(c.tags) ? c.tags : [],
      }));
    } catch (e) {
      this.error = `Failed to load board: ${e}`;
    }
    this.loading = false;
  }

  private async _loadArchive() {
    try {
      const res = await fetch(`${API}/archive`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.archivedCards = data.cards || [];
    } catch (e) {
      this.error = `Failed to load archive: ${e}`;
    }
  }

  private async _addColumn() {
    const title = this.newColumnTitle.trim();
    if (!title) return;
    try {
      const res = await fetch(`${API}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.newColumnTitle = "";
      this.addingColumn = false;
      await this._loadBoard();
    } catch (e) {
      this.error = `Failed to add column: ${e}`;
    }
  }

  private async _deleteColumn(id: string) {
    try {
      const res = await fetch(`${API}/columns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      this.confirmDeleteColumnId = null;
      await this._loadBoard();
    } catch (e) {
      this.error = `Failed to delete column: ${e}`;
      this.confirmDeleteColumnId = null;
    }
  }

  private async _saveCard() {
    const { title, description, assignee, priority, deadline, tags, columnId } = this.formData;
    if (!title.trim()) return;
    const payload = {
      title, description, assignee, priority, columnId,
      deadline: deadline || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (this.editingCard) {
        const res = await fetch(`${API}/cards/${this.editingCard.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        const res = await fetch(`${API}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      this._closeModal();
      await this._loadBoard();
    } catch (e) {
      this.error = `Failed to save card: ${e}`;
    }
  }

  // Archive a single card (replaces delete)
  private async _archiveCard(id: string) {
    // Optimistic: remove from local state immediately
    const card = this.cards.find((c) => c.id === id);
    this.cards = this.cards.filter((c) => c.id !== id);
    this.confirmArchiveCardId = null;

    try {
      const res = await fetch(`${API}/cards/${id}/archive`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (card) this._showToast(`Archived "${card.title}"`);
    } catch (e) {
      // Rollback
      if (card) this.cards = [...this.cards, card];
      this._showToast(`Failed to archive: ${e}`);
    }
  }

  // Optimistic drag & drop — no reload
  private async _moveCard(cardId: string, targetColumnId: string, targetIndex: number) {
    const cardIdx = this.cards.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return;

    // Optimistic local update
    const updatedCards = [...this.cards];
    const card = { ...updatedCards[cardIdx] };
    const oldColumnId = card.columnId;
    card.columnId = targetColumnId;

    // Reorder target column
    const targetCards = updatedCards
      .filter((c) => c.columnId === targetColumnId && c.id !== cardId)
      .sort((a, b) => a.order - b.order);
    const clampedIdx = Math.min(targetIndex, targetCards.length);
    targetCards.splice(clampedIdx, 0, card);
    targetCards.forEach((c, i) => { c.order = i; });

    // Reorder source column if different
    if (oldColumnId !== targetColumnId) {
      const sourceCards = updatedCards
        .filter((c) => c.columnId === oldColumnId && c.id !== cardId)
        .sort((a, b) => a.order - b.order);
      sourceCards.forEach((c, i) => { c.order = i; });
    }

    // Apply locally — swap the moved card's data
    updatedCards[cardIdx] = card;
    this.cards = updatedCards;

    // Fire API in background
    try {
      const res = await fetch(`${API}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, targetColumnId, targetIndex }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // On failure, reload to get correct state
      await this._loadBoard();
    }
  }

  private async _archiveDone() {
    try {
      const res = await fetch(`${API}/archive-done`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._showToast(`Archived ${data.archived} card${data.archived !== 1 ? "s" : ""}`);
      await this._loadBoard();
    } catch (e) {
      this.error = `Failed to archive: ${e}`;
    }
  }

  private async _restoreCard(id: string) {
    try {
      const res = await fetch(`${API}/archive/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._showToast("Card restored");
      await this._loadArchive();
      await this._loadBoard();
    } catch (e) {
      this.error = `Failed to restore: ${e}`;
    }
  }

  // ── Modal ─────────────────────────────────────────────────
  private _openAddCard(columnId: string) {
    this.editingCard = null;
    this.formData = {
      title: "", description: "", assignee: "", priority: "mid",
      deadline: "", tags: "", columnId,
    };
    this.modalOpen = true;
  }

  private _openEditCard(card: KanbanCard) {
    this.editingCard = card;
    this.formData = {
      title: card.title,
      description: card.description,
      assignee: card.assignee,
      priority: card.priority,
      deadline: card.deadline || "",
      tags: (card.tags || []).join(", "),
      columnId: card.columnId,
    };
    this.modalOpen = true;
  }

  private _closeModal() {
    this.modalOpen = false;
    this.editingCard = null;
  }

  // ── Drag & Drop ─────────────────────────────────────────────
  private _onDragStart(e: DragEvent, cardId: string) {
    this.dragCardId = cardId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", cardId);
    }
  }

  private _onDragEnd() {
    this.dragCardId = null;
    this.dragOverColumnId = null;
    this.dragOverIndex = null;
  }

  private _onColumnDragOver(e: DragEvent, columnId: string) {
    e.preventDefault();
    if (!this.dragCardId) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    this.dragOverColumnId = columnId;
    const container = (e.currentTarget as HTMLElement).querySelector(".col-body");
    if (!container) return;
    const els = Array.from(container.querySelectorAll(".card:not(.dragging)"));
    let idx = els.length;
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { idx = i; break; }
    }
    this.dragOverIndex = idx;
  }

  private _onColumnDragLeave(e: DragEvent, columnId: string) {
    const related = e.relatedTarget as HTMLElement;
    const current = e.currentTarget as HTMLElement;
    if (related && current.contains(related)) return;
    if (this.dragOverColumnId === columnId) {
      this.dragOverColumnId = null;
      this.dragOverIndex = null;
    }
  }

  private _onColumnDrop(e: DragEvent, columnId: string) {
    e.preventDefault();
    const cardId = this.dragCardId;
    const targetIndex = this.dragOverIndex ?? 0;
    this.dragCardId = null;
    this.dragOverColumnId = null;
    this.dragOverIndex = null;
    if (cardId) this._moveCard(cardId, columnId, targetIndex);
  }

  // ── Computed ──────────────────────────────────────────────
  private _allAssignees(): string[] {
    const s = new Set<string>();
    for (const c of this.cards) if (c.assignee) s.add(c.assignee);
    return [...s].sort();
  }

  private _allTags(): string[] {
    const s = new Set<string>();
    for (const c of this.cards) for (const t of c.tags || []) s.add(t);
    return [...s].sort();
  }

  private _cardsForColumn(colId: string): KanbanCard[] {
    const q = this.searchQuery.toLowerCase();
    let out = this.cards.filter((c) => {
      if (c.columnId !== colId) return false;
      if (this.filterAssignee && c.assignee !== this.filterAssignee) return false;
      if (this.filterTag && !(c.tags || []).includes(this.filterTag)) return false;
      if (q && !`${c.title} ${c.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (this.sortByPriority) {
      out = [...out].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    } else {
      out = [...out].sort((a, b) => a.order - b.order);
    }
    return out;
  }

  private _hasDoneCards(): boolean {
    const done = this.columns.find((c) => c.title.toLowerCase() === "done" || c.id === "done");
    return done ? this.cards.some((c) => c.columnId === done.id) : false;
  }

  private _fmtDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
    catch { return ""; }
  }

  private _fmtDeadline(dl: string): string {
    try { return new Date(dl + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
    catch { return dl; }
  }

  // ── Render ────────────────────────────────────────────────
  render() {
    if (this.loading) return html`<div class="center-msg">Loading\u2026</div>`;

    if (this.error) {
      return html`
        <div class="root">
          <div class="header">
            <h2>Tasks</h2>
            <button class="btn btn-secondary" @click=${() => { this.error = null; this._loadBoard(); }}>Retry</button>
          </div>
          <div class="center-msg" style="color:#C8001E">${this.error}</div>
        </div>`;
    }

    if (this.showArchive) return this._renderArchiveView();

    const assignees = this._allAssignees();
    const tags = this._allTags();

    return html`
      <div class="root">
        <div class="header">
          <h2>Tasks</h2>
          <div class="toolbar">
            <input class="t-input" type="text" placeholder="Search\u2026"
              .value=${this.searchQuery}
              @input=${(e: Event) => { this.searchQuery = (e.target as HTMLInputElement).value; }}
            />
            ${assignees.length > 0 ? html`
              <select class="t-select" .value=${this.filterAssignee}
                @change=${(e: Event) => { this.filterAssignee = (e.target as HTMLSelectElement).value; }}>
                <option value="">All people</option>
                ${assignees.map((a) => html`<option value=${a}>${a}</option>`)}
              </select>` : nothing}
            ${tags.length > 0 ? html`
              <select class="t-select" .value=${this.filterTag}
                @change=${(e: Event) => { this.filterTag = (e.target as HTMLSelectElement).value; }}>
                <option value="">All tags</option>
                ${tags.map((t) => html`<option value=${t}>${t}</option>`)}
              </select>` : nothing}
            <button class="btn btn-secondary btn-sm ${this.sortByPriority ? "active" : ""}"
              @click=${() => { this.sortByPriority = !this.sortByPriority; }}>Priority</button>
            ${this._hasDoneCards() ? html`
              <button class="btn btn-amber btn-sm" @click=${() => this._archiveDone()}>Archive Done</button>
            ` : nothing}
            <button class="btn btn-secondary btn-sm" @click=${() => { this.showArchive = true; this._loadArchive(); }}>Archive</button>
            <button class="btn btn-primary btn-sm" @click=${() => this._openAddCard(this.columns[0]?.id || "")}>+ New</button>
          </div>
        </div>

        <div class="board">
          ${this.columns.map((col) => this._renderColumn(col))}
          ${this._renderAddColumn()}
        </div>
      </div>

      ${this.modalOpen ? this._renderModal() : nothing}
      ${this.confirmArchiveCardId ? this._renderConfirmArchive() : nothing}
      ${this.confirmDeleteColumnId ? this._renderConfirmDeleteColumn() : nothing}
      ${this.toastVisible ? html`<div class="toast">${this.toastMsg}</div>` : nothing}
    `;
  }

  private _renderColumn(col: KanbanColumn) {
    const cards = this._cardsForColumn(col.id);
    const isDragOver = this.dragOverColumnId === col.id;

    return html`
      <div class="col ${isDragOver ? "drag-over" : ""}"
        @dragover=${(e: DragEvent) => this._onColumnDragOver(e, col.id)}
        @dragleave=${(e: DragEvent) => this._onColumnDragLeave(e, col.id)}
        @drop=${(e: DragEvent) => this._onColumnDrop(e, col.id)}>
        <div class="col-head">
          <span class="col-label">
            ${col.title}
            <span class="col-count">${cards.length}</span>
          </span>
          <button class="btn btn-ghost btn-sm" title="Delete column"
            @click=${() => { this.confirmDeleteColumnId = col.id; }}>\u00D7</button>
        </div>
        <div class="col-body">
          ${cards.map((card, idx) => html`
            ${isDragOver && this.dragOverIndex === idx ? html`<div class="drop-zone"></div>` : nothing}
            ${this._renderCard(card)}
          `)}
          ${isDragOver && this.dragOverIndex === cards.length ? html`<div class="drop-zone"></div>` : nothing}
        </div>
        <div class="col-foot">
          <button class="add-card-btn" @click=${() => this._openAddCard(col.id)}>+ Add card</button>
        </div>
      </div>
    `;
  }

  private _renderCard(card: KanbanCard) {
    const dragging = this.dragCardId === card.id;
    const dl = deadlineStatus(card.deadline);

    return html`
      <div class="card ${dragging ? "dragging" : ""}" draggable="true"
        @dragstart=${(e: DragEvent) => this._onDragStart(e, card.id)}
        @dragend=${() => this._onDragEnd()}>
        <div class="card-top">
          <div class="card-title">${card.title}</div>
          <div class="card-actions">
            <button class="card-action-btn" title="Edit"
              @click=${(e: Event) => { e.stopPropagation(); this._openEditCard(card); }}>\u270E</button>
            <button class="card-action-btn archive-btn" title="Archive"
              @click=${(e: Event) => { e.stopPropagation(); this.confirmArchiveCardId = card.id; }}>\u2192</button>
          </div>
        </div>
        ${card.description ? html`<div class="card-desc">${card.description}</div>` : nothing}
        ${(card.tags || []).length > 0 ? html`
          <div class="card-tags">
            ${card.tags.map((t) => html`<span class="card-tag" style="background:${tagColor(t)}">${t}</span>`)}
          </div>` : nothing}
        <div class="card-footer">
          <span class="priority-badge">
            <span class="priority-dot ${card.priority}"></span>
            ${PRIORITY_LABELS[card.priority]}
          </span>
          ${card.assignee ? html`<span class="card-assignee">${card.assignee}</span>` : nothing}
          ${dl !== "none" ? html`
            <span class="card-deadline ${dl}">${this._fmtDeadline(card.deadline!)}</span>
          ` : nothing}
          <span class="card-date">${this._fmtDate(card.createdAt)}</span>
        </div>
      </div>
    `;
  }

  private _renderAddColumn() {
    if (this.addingColumn) {
      return html`
        <div class="add-col">
          <div class="add-col-form">
            <input type="text" placeholder="Column title"
              .value=${this.newColumnTitle}
              @input=${(e: Event) => { this.newColumnTitle = (e.target as HTMLInputElement).value; }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") this._addColumn();
                if (e.key === "Escape") this.addingColumn = false;
              }}
            />
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary" style="flex:1" @click=${() => this._addColumn()}>Add</button>
              <button class="btn btn-secondary" @click=${() => { this.addingColumn = false; }}>Cancel</button>
            </div>
          </div>
        </div>`;
    }
    return html`
      <div class="add-col">
        <button class="add-col-trigger" @click=${() => { this.addingColumn = true; }}>+ Add Column</button>
      </div>`;
  }

  private _renderModal() {
    const isEdit = !!this.editingCard;
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this._closeModal(); }}>
        <div class="modal">
          <h3>${isEdit ? "Edit Task" : "New Task"}</h3>

          <div class="fg">
            <label>Title</label>
            <input type="text" placeholder="What needs to be done?"
              .value=${this.formData.title}
              @input=${(e: Event) => { this.formData = { ...this.formData, title: (e.target as HTMLInputElement).value }; }}
            />
          </div>

          <div class="fg">
            <label>Description</label>
            <textarea placeholder="Add details\u2026"
              .value=${this.formData.description}
              @input=${(e: Event) => { this.formData = { ...this.formData, description: (e.target as HTMLTextAreaElement).value }; }}
            ></textarea>
          </div>

          <div class="row">
            <div class="fg">
              <label>Assignee</label>
              <input type="text" placeholder="Name"
                .value=${this.formData.assignee}
                @input=${(e: Event) => { this.formData = { ...this.formData, assignee: (e.target as HTMLInputElement).value }; }}
              />
            </div>
            <div class="fg">
              <label>Priority</label>
              <select .value=${this.formData.priority}
                @change=${(e: Event) => { this.formData = { ...this.formData, priority: (e.target as HTMLSelectElement).value as "low" | "mid" | "high" }; }}>
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="fg">
              <label>Deadline</label>
              <input type="date"
                .value=${this.formData.deadline}
                @input=${(e: Event) => { this.formData = { ...this.formData, deadline: (e.target as HTMLInputElement).value }; }}
              />
            </div>
            <div class="fg">
              <label>Column</label>
              <select .value=${this.formData.columnId}
                @change=${(e: Event) => { this.formData = { ...this.formData, columnId: (e.target as HTMLSelectElement).value }; }}>
                ${this.columns.map((c) => html`
                  <option value=${c.id} ?selected=${c.id === this.formData.columnId}>${c.title}</option>
                `)}
              </select>
            </div>
          </div>

          <div class="fg">
            <label>Tags</label>
            <input type="text" placeholder="design, backend, urgent"
              .value=${this.formData.tags}
              @input=${(e: Event) => { this.formData = { ...this.formData, tags: (e.target as HTMLInputElement).value }; }}
            />
            <div class="hint">Comma-separated</div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click=${() => this._closeModal()}>Cancel</button>
            <button class="btn btn-primary" @click=${() => this._saveCard()}>
              ${isEdit ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </div>`;
  }

  private _renderConfirmArchive() {
    const card = this.cards.find((c) => c.id === this.confirmArchiveCardId);
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.confirmArchiveCardId = null; }}>
        <div class="confirm">
          <p>Archive "${card?.title}"?<br/><span style="color:#8A8A8A;font-size:12px">You can restore it later from the archive.</span></p>
          <div class="confirm-btns">
            <button class="btn btn-secondary" @click=${() => { this.confirmArchiveCardId = null; }}>Cancel</button>
            <button class="btn btn-amber" @click=${() => this._archiveCard(this.confirmArchiveCardId!)}>Archive</button>
          </div>
        </div>
      </div>`;
  }

  private _renderConfirmDeleteColumn() {
    const col = this.columns.find((c) => c.id === this.confirmDeleteColumnId);
    const count = this._cardsForColumn(this.confirmDeleteColumnId!).length;
    return html`
      <div class="overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.confirmDeleteColumnId = null; }}>
        <div class="confirm">
          <p>Delete column "${col?.title}"?${count > 0 ? html`<br/><span style="color:#C8001E">${count} task${count > 1 ? "s" : ""} will be permanently deleted.</span>` : nothing}</p>
          <div class="confirm-btns">
            <button class="btn btn-secondary" @click=${() => { this.confirmDeleteColumnId = null; }}>Cancel</button>
            <button class="btn btn-danger" @click=${() => this._deleteColumn(this.confirmDeleteColumnId!)}>Delete</button>
          </div>
        </div>
      </div>`;
  }

  private _renderArchiveView() {
    return html`
      <div class="archive">
        <div class="archive-head">
          <h2>Archive (${this.archivedCards.length})</h2>
          <button class="btn btn-secondary" @click=${() => { this.showArchive = false; }}>\u2190 Back</button>
        </div>
        ${this.archivedCards.length === 0
          ? html`<div class="center-msg">No archived cards</div>`
          : html`
            <div class="archive-grid">
              ${this.archivedCards.map((card) => html`
                <div class="archive-card">
                  <div class="card-title" style="color:#F5F5F5;margin-bottom:6px">${card.title}</div>
                  ${card.description ? html`<div class="card-desc">${card.description}</div>` : nothing}
                  ${(card.tags || []).length > 0 ? html`
                    <div class="card-tags" style="margin-top:8px">
                      ${card.tags.map((t) => html`<span class="card-tag" style="background:${tagColor(t)}">${t}</span>`)}
                    </div>` : nothing}
                  <div class="card-footer" style="margin-top:10px">
                    <span class="priority-badge">
                      <span class="priority-dot ${card.priority}"></span>
                      ${PRIORITY_LABELS[card.priority]}
                    </span>
                    ${card.assignee ? html`<span class="card-assignee">${card.assignee}</span>` : nothing}
                    <span class="card-date">${this._fmtDate(card.createdAt)}</span>
                    <button class="btn btn-primary btn-sm" style="margin-left:auto" @click=${() => this._restoreCard(card.id)}>Restore</button>
                  </div>
                </div>
              `)}
            </div>`}
      </div>
      ${this.toastVisible ? html`<div class="toast">${this.toastMsg}</div>` : nothing}
    `;
  }
}

export function renderKanban() {
  return html`<kanban-board-view></kanban-board-view>`;
}
