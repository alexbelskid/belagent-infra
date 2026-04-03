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
const PRIORITY_COLORS: Record<string, string> = { low: "#3b82f6", mid: "#f59e0b", high: "#ef4444" };
const PRIORITY_ORDER: Record<string, number> = { high: 0, mid: 1, low: 2 };

const TAG_PALETTE = [
  "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#db2777", "#4f46e5", "#0891b2", "#65a30d", "#ea580c",
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

  // Modal
  @state() private modalOpen = false;
  @state() private editingCard: KanbanCard | null = null;
  @state() private formData: CardFormData = {
    title: "", description: "", assignee: "", priority: "mid",
    deadline: "", tags: "", columnId: "",
  };

  // Column add
  @state() private addingColumn = false;
  @state() private newColumnTitle = "";

  // Drag
  @state() private dragCardId: string | null = null;
  @state() private dragOverColumnId: string | null = null;
  @state() private dragOverIndex: number | null = null;

  // Delete confirmation
  @state() private confirmDeleteCardId: string | null = null;
  @state() private confirmDeleteColumnId: string | null = null;

  // Filters & search
  @state() private searchQuery = "";
  @state() private filterAssignee = "";
  @state() private filterTag = "";
  @state() private sortByPriority = false;

  // Archive
  @state() private showArchive = false;
  @state() private archivedCards: KanbanCard[] = [];

  // Toast
  @state() private toastMsg = "";
  @state() private toastVisible = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: var(--oc-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: #e2e8f0;
    }

    .kanban-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0f0f17;
    }

    /* ── Header + Toolbar ── */
    .kanban-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px;
      border-bottom: 1px solid #1e1e2e;
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: wrap;
    }
    .kanban-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
      justify-content: flex-end;
    }
    .toolbar-input {
      background: #16161f;
      border: 1px solid #252536;
      border-radius: 6px;
      padding: 6px 10px;
      color: #e2e8f0;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      min-width: 140px;
      transition: border-color 0.15s;
    }
    .toolbar-input:focus { border-color: #7c3aed; }
    .toolbar-select {
      background: #16161f;
      border: 1px solid #252536;
      border-radius: 6px;
      padding: 6px 8px;
      color: #e2e8f0;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      max-width: 130px;
    }

    /* ── Board ── */
    .kanban-board {
      display: flex;
      gap: 16px;
      padding: 20px 24px;
      overflow-x: auto;
      flex: 1;
      align-items: flex-start;
    }

    /* ── Column ── */
    .kanban-column {
      min-width: 280px;
      max-width: 320px;
      width: 280px;
      background: #16161f;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      max-height: 100%;
      flex-shrink: 0;
      border: 1px solid #1e1e2e;
      transition: border-color 0.15s;
    }
    .kanban-column.drag-over { border-color: #7c3aed; }
    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid #1e1e2e;
    }
    .column-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .column-count {
      background: #1e1e2e;
      color: #64748b;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 10px;
      font-weight: 500;
    }
    .column-actions { display: flex; gap: 4px; }
    .column-cards {
      padding: 8px 10px;
      overflow-y: auto;
      flex: 1;
      min-height: 60px;
    }

    /* ── Card ── */
    .kanban-card {
      background: #1a1a27;
      border: 1px solid #252536;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 8px;
      cursor: grab;
      transition: transform 0.1s, box-shadow 0.15s, border-color 0.15s;
      user-select: none;
    }
    .kanban-card:hover {
      border-color: #3b3b5c;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .kanban-card:active { cursor: grabbing; }
    .kanban-card.dragging { opacity: 0.4; transform: scale(0.97); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .card-title {
      font-size: 14px;
      font-weight: 500;
      color: #f1f5f9;
      margin-bottom: 4px;
      line-height: 1.4;
      flex: 1;
    }
    .card-desc {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }
    .card-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 1px 7px;
      border-radius: 10px;
      color: #fff;
      opacity: 0.9;
    }
    .card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .card-priority {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 4px;
      color: #fff;
    }
    .card-assignee {
      font-size: 11px;
      color: #7c3aed;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
    }
    .card-date {
      font-size: 10px;
      color: #475569;
      flex-shrink: 0;
    }
    .card-deadline {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .card-deadline.overdue { background: #dc2626; color: #fff; }
    .card-deadline.soon { background: #d97706; color: #fff; }
    .card-deadline.ok { background: #1e1e2e; color: #94a3b8; }
    .card-actions {
      display: flex;
      gap: 2px;
      opacity: 0;
      transition: opacity 0.1s;
      flex-shrink: 0;
    }
    .kanban-card:hover .card-actions { opacity: 1; }

    .drop-indicator {
      height: 3px;
      background: #7c3aed;
      border-radius: 2px;
      margin: 4px 0;
    }

    /* ── Buttons ── */
    .btn {
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      transition: background 0.15s, opacity 0.15s;
    }
    .btn-primary { background: #7c3aed; color: #fff; padding: 7px 14px; }
    .btn-primary:hover { background: #6d28d9; }
    .btn-ghost { background: transparent; color: #94a3b8; padding: 4px 8px; }
    .btn-ghost:hover { background: #1e1e2e; color: #e2e8f0; }
    .btn-danger { background: #dc2626; color: #fff; padding: 8px 16px; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-sm { font-size: 11px; padding: 3px 6px; border-radius: 4px; }
    .btn-amber { background: #d97706; color: #fff; padding: 6px 12px; font-size: 12px; }
    .btn-amber:hover { background: #b45309; }
    .btn-execute {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 13px;
      padding: 2px 5px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .btn-execute:hover { background: #1e1e2e; }
    .btn-active { background: #7c3aed !important; color: #fff !important; }
    .btn-add-card {
      width: 100%;
      background: transparent;
      border: 1px dashed #252536;
      color: #64748b;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      margin: 4px 0 8px;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-add-card:hover { border-color: #7c3aed; color: #a78bfa; }

    /* ── Add column ── */
    .add-column { min-width: 280px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    .add-column-btn {
      background: transparent;
      border: 2px dashed #252536;
      border-radius: 12px;
      color: #64748b;
      padding: 20px;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.15s, color 0.15s;
      text-align: center;
    }
    .add-column-btn:hover { border-color: #7c3aed; color: #a78bfa; }
    .add-column-form {
      background: #16161f;
      border: 1px solid #1e1e2e;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* ── Modal ── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }
    .modal {
      background: #16161f;
      border: 1px solid #252536;
      border-radius: 16px;
      padding: 24px;
      width: 460px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .modal h3 { margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #f1f5f9; }
    .form-group { margin-bottom: 14px; }
    .form-group label {
      display: block; font-size: 12px; font-weight: 500; color: #94a3b8;
      margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%; background: #0f0f17; border: 1px solid #252536;
      border-radius: 6px; padding: 9px 12px; color: #e2e8f0;
      font-size: 13px; font-family: inherit; outline: none;
      transition: border-color 0.15s; box-sizing: border-box;
    }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      border-color: #7c3aed;
    }
    .form-group textarea { resize: vertical; min-height: 70px; }
    .form-group select { cursor: pointer; }
    .form-hint { font-size: 11px; color: #475569; margin-top: 3px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

    /* ── Confirm ── */
    .confirm-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000;
    }
    .confirm-box {
      background: #16161f; border: 1px solid #252536; border-radius: 12px;
      padding: 24px; width: 340px; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .confirm-box p { color: #94a3b8; font-size: 14px; margin: 0 0 16px; }
    .confirm-actions { display: flex; gap: 8px; justify-content: center; }

    /* ── Archive ── */
    .archive-panel {
      background: #0f0f17;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .archive-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px; border-bottom: 1px solid #1e1e2e;
    }
    .archive-header h2 { margin: 0; font-size: 18px; font-weight: 600; color: #f1f5f9; }
    .archive-list {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      align-content: start;
    }
    .archive-card {
      background: #16161f;
      border: 1px solid #1e1e2e;
      border-radius: 8px;
      padding: 14px;
    }
    .archive-card .card-title { margin-bottom: 6px; }
    .archive-card .card-meta { margin-top: 8px; }

    /* ── Toast ── */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #16161f;
      border: 1px solid #7c3aed;
      border-radius: 10px;
      padding: 12px 20px;
      color: #e2e8f0;
      font-size: 13px;
      z-index: 10001;
      box-shadow: 0 8px 32px rgba(124, 58, 237, 0.3);
      animation: toastIn 0.25s ease-out;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .center-msg {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: #64748b; font-size: 14px;
    }
  `;

  // ── Lifecycle ───────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this._loadBoard();
  }

  // ── Toast ───────────────────────────────────────────────────
  private _showToast(msg: string) {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false; }, 2500);
  }

  // ── API ─────────────────────────────────────────────────────
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

  private async _deleteCard(id: string) {
    try {
      const res = await fetch(`${API}/cards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.confirmDeleteCardId = null;
      await this._loadBoard();
    } catch (e) {
      this.error = `Failed to delete card: ${e}`;
      this.confirmDeleteCardId = null;
    }
  }

  private async _moveCard(cardId: string, targetColumnId: string, targetIndex: number) {
    try {
      const res = await fetch(`${API}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, targetColumnId, targetIndex }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await this._loadBoard();
    } catch (e) {
      this.error = `Failed to move card: ${e}`;
    }
  }

  private async _executeCard(card: KanbanCard) {
    try {
      const res = await fetch(`${API}/cards/${card.id}/execute`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._showToast(`\u26A1 Sent to agent: "${card.title}"`);
    } catch (e) {
      this._showToast(`Failed: ${e}`);
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
    const cardsContainer = (e.currentTarget as HTMLElement).querySelector(".column-cards");
    if (!cardsContainer) return;
    const cardEls = Array.from(cardsContainer.querySelectorAll(".kanban-card:not(.dragging)"));
    let idx = cardEls.length;
    for (let i = 0; i < cardEls.length; i++) {
      const rect = cardEls[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { idx = i; break; }
    }
    this.dragOverIndex = idx;
  }

  private _onColumnDragLeave(e: DragEvent, columnId: string) {
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
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
    const set = new Set<string>();
    for (const c of this.cards) { if (c.assignee) set.add(c.assignee); }
    return [...set].sort();
  }

  private _allTags(): string[] {
    const set = new Set<string>();
    for (const c of this.cards) {
      for (const t of c.tags || []) set.add(t);
    }
    return [...set].sort();
  }

  private _cardsForColumn(columnId: string): KanbanCard[] {
    const q = this.searchQuery.toLowerCase();
    let cards = this.cards
      .filter((c) => c.columnId === columnId)
      .filter((c) => {
        if (this.filterAssignee && c.assignee !== this.filterAssignee) return false;
        if (this.filterTag && !(c.tags || []).includes(this.filterTag)) return false;
        if (q) {
          const hay = `${c.title} ${c.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    if (this.sortByPriority) {
      cards = [...cards].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    } else {
      cards = [...cards].sort((a, b) => a.order - b.order);
    }
    return cards;
  }

  private _hasDoneCards(): boolean {
    const doneCol = this.columns.find((c) =>
      c.title.toLowerCase() === "done" || c.id === "done"
    );
    return doneCol ? this.cards.some((c) => c.columnId === doneCol.id) : false;
  }

  private _formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return ""; }
  }

  private _formatDeadline(dl: string): string {
    try {
      return new Date(dl + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return dl; }
  }

  // ── Render ──────────────────────────────────────────────────
  render() {
    if (this.loading) return html`<div class="center-msg">Loading board\u2026</div>`;

    if (this.error) {
      return html`
        <div class="kanban-root">
          <div class="kanban-header">
            <h2>Tasks</h2>
            <button class="btn btn-ghost" @click=${() => { this.error = null; this._loadBoard(); }}>Retry</button>
          </div>
          <div class="center-msg" style="color:#ef4444">${this.error}</div>
        </div>
      `;
    }

    if (this.showArchive) return this._renderArchiveView();

    const assignees = this._allAssignees();
    const tags = this._allTags();

    return html`
      <div class="kanban-root">
        <div class="kanban-header">
          <h2>Tasks</h2>
          <div class="toolbar">
            <input class="toolbar-input" type="text" placeholder="\uD83D\uDD0D Search\u2026"
              .value=${this.searchQuery}
              @input=${(e: Event) => { this.searchQuery = (e.target as HTMLInputElement).value; }}
            />
            ${assignees.length > 0 ? html`
              <select class="toolbar-select"
                .value=${this.filterAssignee}
                @change=${(e: Event) => { this.filterAssignee = (e.target as HTMLSelectElement).value; }}>
                <option value="">All assignees</option>
                ${assignees.map((a) => html`<option value=${a}>${a}</option>`)}
              </select>
            ` : nothing}
            ${tags.length > 0 ? html`
              <select class="toolbar-select"
                .value=${this.filterTag}
                @change=${(e: Event) => { this.filterTag = (e.target as HTMLSelectElement).value; }}>
                <option value="">All tags</option>
                ${tags.map((t) => html`<option value=${t}>${t}</option>`)}
              </select>
            ` : nothing}
            <button class="btn btn-ghost btn-sm ${this.sortByPriority ? "btn-active" : ""}"
              title="Sort by priority"
              @click=${() => { this.sortByPriority = !this.sortByPriority; }}>
              \u2195 Priority
            </button>
            ${this._hasDoneCards() ? html`
              <button class="btn btn-amber btn-sm" @click=${() => this._archiveDone()}>
                \uD83D\uDCE6 Archive Done
              </button>
            ` : nothing}
            <button class="btn btn-ghost btn-sm" @click=${() => { this.showArchive = true; this._loadArchive(); }}>
              \uD83D\uDDC4\uFE0F Archive
            </button>
            <button class="btn btn-primary" @click=${() => this._openAddCard(this.columns[0]?.id || "")}>
              + New Task
            </button>
          </div>
        </div>

        <div class="kanban-board">
          ${this.columns.map((col) => this._renderColumn(col))}
          ${this._renderAddColumn()}
        </div>
      </div>

      ${this.modalOpen ? this._renderModal() : nothing}
      ${this.confirmDeleteCardId ? this._renderConfirmDeleteCard() : nothing}
      ${this.confirmDeleteColumnId ? this._renderConfirmDeleteColumn() : nothing}
      ${this.toastVisible ? html`<div class="toast">${this.toastMsg}</div>` : nothing}
    `;
  }

  private _renderColumn(col: KanbanColumn) {
    const cards = this._cardsForColumn(col.id);
    const isDragOver = this.dragOverColumnId === col.id;

    return html`
      <div class="kanban-column ${isDragOver ? "drag-over" : ""}"
        @dragover=${(e: DragEvent) => this._onColumnDragOver(e, col.id)}
        @dragleave=${(e: DragEvent) => this._onColumnDragLeave(e, col.id)}
        @drop=${(e: DragEvent) => this._onColumnDrop(e, col.id)}>
        <div class="column-header">
          <span class="column-title">
            ${col.title}
            <span class="column-count">${cards.length}</span>
          </span>
          <div class="column-actions">
            <button class="btn btn-ghost btn-sm" title="Delete column"
              @click=${() => { this.confirmDeleteColumnId = col.id; }}>\u2716</button>
          </div>
        </div>
        <div class="column-cards">
          ${cards.map((card, idx) => html`
            ${isDragOver && this.dragOverIndex === idx ? html`<div class="drop-indicator"></div>` : nothing}
            ${this._renderCard(card)}
          `)}
          ${isDragOver && this.dragOverIndex === cards.length ? html`<div class="drop-indicator"></div>` : nothing}
        </div>
        <div style="padding: 0 10px 6px;">
          <button class="btn-add-card" @click=${() => this._openAddCard(col.id)}>+ Add card</button>
        </div>
      </div>
    `;
  }

  private _renderCard(card: KanbanCard) {
    const isDragging = this.dragCardId === card.id;
    const dlStatus = deadlineStatus(card.deadline);

    return html`
      <div class="kanban-card ${isDragging ? "dragging" : ""}"
        draggable="true"
        @dragstart=${(e: DragEvent) => this._onDragStart(e, card.id)}
        @dragend=${() => this._onDragEnd()}>
        <div class="card-top">
          <div class="card-title">${card.title}</div>
          <div class="card-actions">
            <button class="btn-execute" title="Send to agent"
              @click=${(e: Event) => { e.stopPropagation(); this._executeCard(card); }}>\u26A1</button>
            <button class="btn btn-ghost btn-sm" title="Edit"
              @click=${(e: Event) => { e.stopPropagation(); this._openEditCard(card); }}>\u270E</button>
            <button class="btn btn-ghost btn-sm" title="Delete"
              @click=${(e: Event) => { e.stopPropagation(); this.confirmDeleteCardId = card.id; }}>\u2716</button>
          </div>
        </div>
        ${card.description ? html`<div class="card-desc">${card.description}</div>` : nothing}
        ${(card.tags || []).length > 0 ? html`
          <div class="card-tags">
            ${card.tags.map((t) => html`
              <span class="card-tag" style="background:${tagColor(t)}">${t}</span>
            `)}
          </div>
        ` : nothing}
        <div class="card-meta">
          <span class="card-priority" style="background:${PRIORITY_COLORS[card.priority]}">
            ${PRIORITY_LABELS[card.priority]}
          </span>
          ${card.assignee ? html`<span class="card-assignee">${card.assignee}</span>` : nothing}
          ${dlStatus !== "none" ? html`
            <span class="card-deadline ${dlStatus}">
              ${dlStatus === "overdue" ? "\u26A0 " : ""}${this._formatDeadline(card.deadline!)}
            </span>
          ` : nothing}
          <span class="card-date">${this._formatDate(card.createdAt)}</span>
        </div>
      </div>
    `;
  }

  private _renderAddColumn() {
    if (this.addingColumn) {
      return html`
        <div class="add-column">
          <div class="add-column-form">
            <input type="text" placeholder="Column title"
              .value=${this.newColumnTitle}
              @input=${(e: Event) => { this.newColumnTitle = (e.target as HTMLInputElement).value; }}
              @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") this._addColumn(); if (e.key === "Escape") this.addingColumn = false; }}
              style="background:#0f0f17;border:1px solid #252536;border-radius:6px;padding:9px 12px;color:#e2e8f0;font-size:13px;font-family:inherit;outline:none;width:100%;box-sizing:border-box;"
            />
            <div style="display:flex;gap:6px;">
              <button class="btn btn-primary" style="flex:1" @click=${() => this._addColumn()}>Add</button>
              <button class="btn btn-ghost" @click=${() => { this.addingColumn = false; }}>Cancel</button>
            </div>
          </div>
        </div>
      `;
    }
    return html`
      <div class="add-column">
        <button class="add-column-btn" @click=${() => { this.addingColumn = true; }}>+ Add Column</button>
      </div>
    `;
  }

  private _renderModal() {
    const isEdit = !!this.editingCard;
    return html`
      <div class="modal-overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this._closeModal(); }}>
        <div class="modal">
          <h3>${isEdit ? "Edit Task" : "New Task"}</h3>

          <div class="form-group">
            <label>Title</label>
            <input type="text" placeholder="Task title"
              .value=${this.formData.title}
              @input=${(e: Event) => { this.formData = { ...this.formData, title: (e.target as HTMLInputElement).value }; }}
            />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea placeholder="Optional description"
              .value=${this.formData.description}
              @input=${(e: Event) => { this.formData = { ...this.formData, description: (e.target as HTMLTextAreaElement).value }; }}
            ></textarea>
          </div>

          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label>Assignee</label>
              <input type="text" placeholder="Who"
                .value=${this.formData.assignee}
                @input=${(e: Event) => { this.formData = { ...this.formData, assignee: (e.target as HTMLInputElement).value }; }}
              />
            </div>
            <div class="form-group" style="flex:1">
              <label>Priority</label>
              <select .value=${this.formData.priority}
                @change=${(e: Event) => { this.formData = { ...this.formData, priority: (e.target as HTMLSelectElement).value as "low" | "mid" | "high" }; }}>
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label>Deadline</label>
              <input type="date"
                .value=${this.formData.deadline}
                @input=${(e: Event) => { this.formData = { ...this.formData, deadline: (e.target as HTMLInputElement).value }; }}
              />
            </div>
            <div class="form-group" style="flex:1">
              <label>Column</label>
              <select .value=${this.formData.columnId}
                @change=${(e: Event) => { this.formData = { ...this.formData, columnId: (e.target as HTMLSelectElement).value }; }}>
                ${this.columns.map((c) => html`
                  <option value=${c.id} ?selected=${c.id === this.formData.columnId}>${c.title}</option>
                `)}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Tags</label>
            <input type="text" placeholder="bug, backend, urgent"
              .value=${this.formData.tags}
              @input=${(e: Event) => { this.formData = { ...this.formData, tags: (e.target as HTMLInputElement).value }; }}
            />
            <div class="form-hint">Comma-separated</div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-ghost" @click=${() => this._closeModal()}>Cancel</button>
            <button class="btn btn-primary" @click=${() => this._saveCard()}>
              ${isEdit ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderConfirmDeleteCard() {
    return html`
      <div class="confirm-overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.confirmDeleteCardId = null; }}>
        <div class="confirm-box">
          <p>Delete this task?</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost" @click=${() => { this.confirmDeleteCardId = null; }}>Cancel</button>
            <button class="btn btn-danger" @click=${() => this._deleteCard(this.confirmDeleteCardId!)}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderConfirmDeleteColumn() {
    const col = this.columns.find((c) => c.id === this.confirmDeleteColumnId);
    const cardCount = this._cardsForColumn(this.confirmDeleteColumnId!).length;
    return html`
      <div class="confirm-overlay" @click=${(e: Event) => { if (e.target === e.currentTarget) this.confirmDeleteColumnId = null; }}>
        <div class="confirm-box">
          <p>Delete column "${col?.title}"?${cardCount > 0 ? html`<br/><span style="color:#ef4444">${cardCount} task${cardCount > 1 ? "s" : ""} will be deleted.</span>` : nothing}</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost" @click=${() => { this.confirmDeleteColumnId = null; }}>Cancel</button>
            <button class="btn btn-danger" @click=${() => this._deleteColumn(this.confirmDeleteColumnId!)}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderArchiveView() {
    return html`
      <div class="archive-panel">
        <div class="archive-header">
          <h2>\uD83D\uDDC4\uFE0F Archive (${this.archivedCards.length})</h2>
          <button class="btn btn-ghost" @click=${() => { this.showArchive = false; }}>\u2190 Back to board</button>
        </div>
        ${this.archivedCards.length === 0
          ? html`<div class="center-msg">No archived cards</div>`
          : html`
            <div class="archive-list">
              ${this.archivedCards.map((card) => html`
                <div class="archive-card">
                  <div class="card-title">${card.title}</div>
                  ${card.description ? html`<div class="card-desc">${card.description}</div>` : nothing}
                  ${(card.tags || []).length > 0 ? html`
                    <div class="card-tags">
                      ${card.tags.map((t) => html`<span class="card-tag" style="background:${tagColor(t)}">${t}</span>`)}
                    </div>
                  ` : nothing}
                  <div class="card-meta">
                    <span class="card-priority" style="background:${PRIORITY_COLORS[card.priority]}">
                      ${PRIORITY_LABELS[card.priority]}
                    </span>
                    ${card.assignee ? html`<span class="card-assignee">${card.assignee}</span>` : nothing}
                    <span class="card-date">${this._formatDate(card.createdAt)}</span>
                    <button class="btn btn-primary btn-sm" @click=${() => this._restoreCard(card.id)}>Restore</button>
                  </div>
                </div>
              `)}
            </div>
          `}
      </div>
      ${this.toastVisible ? html`<div class="toast">${this.toastMsg}</div>` : nothing}
    `;
  }
}

export function renderKanban() {
  return html`<kanban-board-view></kanban-board-view>`;
}
