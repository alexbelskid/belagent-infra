const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = parseInt(process.env.PORT || "3001", 10);
const DATA_DIR = path.join(__dirname, "..", "data");
const KANBAN_FILE = process.env.KANBAN_DATA || path.join(DATA_DIR, "kanban.json");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");

// ── Helpers ─────────────────────────────────────────────────────
function uid() { return crypto.randomBytes(6).toString("hex"); }

function readJSON(file, seed) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { fs.mkdirSync(path.dirname(file), { recursive: true }); writeJSON(file, seed); return seed; }
}
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readBoard() {
  const raw = readJSON(KANBAN_FILE, { columns: [
    { id: "todo", title: "To Do", order: 0 },
    { id: "in-progress", title: "In Progress", order: 1 },
    { id: "done", title: "Done", order: 2 },
  ], cards: [], archive: [] });
  if (!Array.isArray(raw.archive)) raw.archive = [];
  for (const c of [...raw.cards, ...raw.archive]) {
    if (c.deadline === undefined) c.deadline = null;
    if (!Array.isArray(c.tags)) c.tags = [];
    if (c.archived === undefined) c.archived = false;
  }
  return raw;
}
function writeBoard(b) { writeJSON(KANBAN_FILE, b); }

function readNotes() {
  return readJSON(NOTES_FILE, { notes: [] });
}
function writeNotes(d) { writeJSON(NOTES_FILE, d); }

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
}

// ── Routes ──────────────────────────────────────────────────────
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") return json(res, 204, null);

  // ════════════════════════════════════════════════════════════
  //  KANBAN API
  // ════════════════════════════════════════════════════════════

  if (method === "GET" && p === "/api/kanban") {
    const board = readBoard();
    return json(res, 200, { columns: board.columns, cards: board.cards.filter((c) => !c.archived) });
  }

  if (method === "GET" && p === "/api/kanban/archive") {
    return json(res, 200, { cards: readBoard().archive });
  }

  if (method === "POST" && p === "/api/kanban/archive-done") {
    const board = readBoard();
    const doneCol = board.columns.find((c) => c.title.toLowerCase() === "done" || c.id === "done");
    if (!doneCol) return json(res, 400, { error: "no Done column" });
    const toArchive = board.cards.filter((c) => c.columnId === doneCol.id);
    if (!toArchive.length) return json(res, 200, { archived: 0 });
    for (const c of toArchive) { c.archived = true; c.archivedAt = new Date().toISOString(); board.archive.push(c); }
    board.cards = board.cards.filter((c) => c.columnId !== doneCol.id);
    writeBoard(board);
    return json(res, 200, { archived: toArchive.length });
  }

  const restoreMatch = p.match(/^\/api\/kanban\/archive\/([^/]+)\/restore$/);
  if (method === "POST" && restoreMatch) {
    const board = readBoard();
    const idx = board.archive.findIndex((c) => c.id === restoreMatch[1]);
    if (idx === -1) return json(res, 404, { error: "not found" });
    const card = board.archive.splice(idx, 1)[0];
    card.archived = false; delete card.archivedAt;
    card.columnId = board.columns[0]?.id || "todo";
    card.order = board.cards.filter((c) => c.columnId === card.columnId).reduce((m, c) => Math.max(m, c.order), -1) + 1;
    board.cards.push(card);
    writeBoard(board);
    return json(res, 200, card);
  }

  if (method === "POST" && p === "/api/kanban/columns") {
    const body = await parseBody(req);
    if (!body.title) return json(res, 400, { error: "title required" });
    const board = readBoard();
    const col = { id: uid(), title: body.title, order: board.columns.reduce((m, c) => Math.max(m, c.order), -1) + 1 };
    board.columns.push(col);
    writeBoard(board);
    return json(res, 201, col);
  }

  const colPut = p.match(/^\/api\/kanban\/columns\/([^/]+)$/);
  if (method === "PUT" && colPut) {
    const body = await parseBody(req);
    const board = readBoard();
    const col = board.columns.find((c) => c.id === colPut[1]);
    if (!col) return json(res, 404, { error: "not found" });
    if (body.title !== undefined) col.title = body.title;
    if (body.order !== undefined) col.order = body.order;
    writeBoard(board);
    return json(res, 200, col);
  }

  const colDel = p.match(/^\/api\/kanban\/columns\/([^/]+)$/);
  if (method === "DELETE" && colDel) {
    const board = readBoard();
    const idx = board.columns.findIndex((c) => c.id === colDel[1]);
    if (idx === -1) return json(res, 404, { error: "not found" });
    if (board.columns.length <= 1) return json(res, 400, { error: "cannot delete last column" });
    const removed = board.columns.splice(idx, 1)[0];
    board.cards = board.cards.filter((c) => c.columnId !== removed.id);
    writeBoard(board);
    return json(res, 200, { deleted: removed.id });
  }

  if (method === "POST" && p === "/api/kanban/cards") {
    const body = await parseBody(req);
    if (!body.title) return json(res, 400, { error: "title required" });
    const board = readBoard();
    const colId = body.columnId || board.columns[0]?.id || "todo";
    if (!board.columns.find((c) => c.id === colId)) return json(res, 400, { error: "invalid columnId" });
    const card = {
      id: uid(), columnId: colId, title: body.title,
      description: body.description || "", assignee: body.assignee || "",
      priority: ["low","mid","high"].includes(body.priority) ? body.priority : "mid",
      deadline: body.deadline || null, tags: sanitizeTags(body.tags),
      createdAt: new Date().toISOString(),
      order: board.cards.filter((c) => c.columnId === colId).reduce((m, c) => Math.max(m, c.order), -1) + 1,
      archived: false,
    };
    board.cards.push(card);
    writeBoard(board);
    return json(res, 201, card);
  }

  const cardPut = p.match(/^\/api\/kanban\/cards\/([^/]+)$/);
  if (method === "PUT" && cardPut) {
    const body = await parseBody(req);
    const board = readBoard();
    const card = board.cards.find((c) => c.id === cardPut[1]);
    if (!card) return json(res, 404, { error: "not found" });
    if (body.title !== undefined) card.title = body.title;
    if (body.description !== undefined) card.description = body.description;
    if (body.assignee !== undefined) card.assignee = body.assignee;
    if (body.priority !== undefined && ["low","mid","high"].includes(body.priority)) card.priority = body.priority;
    if (body.deadline !== undefined) card.deadline = body.deadline || null;
    if (body.tags !== undefined) card.tags = sanitizeTags(body.tags);
    if (body.columnId !== undefined) {
      if (!board.columns.find((c) => c.id === body.columnId)) return json(res, 400, { error: "invalid columnId" });
      card.columnId = body.columnId;
    }
    if (body.order !== undefined) card.order = body.order;
    writeBoard(board);
    return json(res, 200, card);
  }

  const statusPatch = p.match(/^\/api\/kanban\/cards\/([^/]+)\/status$/);
  if (method === "PATCH" && statusPatch) {
    const body = await parseBody(req);
    if (!body.columnId) return json(res, 400, { error: "columnId required" });
    const board = readBoard();
    const card = board.cards.find((c) => c.id === statusPatch[1]);
    if (!card) return json(res, 404, { error: "not found" });
    const targetCol = board.columns.find((c) => c.id === body.columnId);
    if (!targetCol) return json(res, 400, { error: "invalid columnId" });
    const oldCol = card.columnId;
    card.columnId = body.columnId;
    board.cards.filter((c) => c.columnId === body.columnId).sort((a,b) => a.order - b.order).forEach((c,i) => { c.order = i; });
    if (oldCol !== body.columnId) board.cards.filter((c) => c.columnId === oldCol).sort((a,b) => a.order - b.order).forEach((c,i) => { c.order = i; });
    writeBoard(board);
    return json(res, 200, card);
  }

  const execMatch = p.match(/^\/api\/kanban\/cards\/([^/]+)\/execute$/);
  if (method === "POST" && execMatch) {
    const board = readBoard();
    const card = board.cards.find((c) => c.id === execMatch[1]);
    if (!card) return json(res, 404, { error: "not found" });
    console.log(`[execute] "${card.title}" (${card.id})`);
    return json(res, 200, { ok: true, message: "Sent to agent", card });
  }

  const cardDel = p.match(/^\/api\/kanban\/cards\/([^/]+)$/);
  if (method === "DELETE" && cardDel) {
    const board = readBoard();
    const idx = board.cards.findIndex((c) => c.id === cardDel[1]);
    if (idx === -1) return json(res, 404, { error: "not found" });
    board.cards.splice(idx, 1);
    writeBoard(board);
    return json(res, 200, { deleted: cardDel[1] });
  }

  if (method === "PUT" && p === "/api/kanban/reorder") {
    const body = await parseBody(req);
    if (!body.cardId || !body.targetColumnId) return json(res, 400, { error: "cardId and targetColumnId required" });
    const board = readBoard();
    const card = board.cards.find((c) => c.id === body.cardId);
    if (!card) return json(res, 404, { error: "not found" });
    if (!board.columns.find((c) => c.id === body.targetColumnId)) return json(res, 400, { error: "invalid column" });
    const oldCol = card.columnId;
    card.columnId = body.targetColumnId;
    const target = board.cards.filter((c) => c.columnId === body.targetColumnId && c.id !== card.id).sort((a,b) => a.order - b.order);
    const at = typeof body.targetIndex === "number" ? Math.min(body.targetIndex, target.length) : target.length;
    target.splice(at, 0, card);
    target.forEach((c,i) => { c.order = i; });
    if (oldCol !== body.targetColumnId) board.cards.filter((c) => c.columnId === oldCol).sort((a,b) => a.order - b.order).forEach((c,i) => { c.order = i; });
    writeBoard(board);
    return json(res, 200, { ok: true });
  }

  // ════════════════════════════════════════════════════════════
  //  NOTES API
  // ════════════════════════════════════════════════════════════

  // GET /api/notes — list all notes (id, title, updatedAt)
  if (method === "GET" && p === "/api/notes") {
    const { notes } = readNotes();
    const list = notes.map(({ id, title, icon, updatedAt, createdAt, tags }) => ({
      id, title, icon: icon || "", updatedAt, createdAt, tags: tags || [],
    }));
    return json(res, 200, { notes: list });
  }

  // GET /api/notes/:id — full note with content
  const noteGet = p.match(/^\/api\/notes\/([^/]+)$/);
  if (method === "GET" && noteGet) {
    const { notes } = readNotes();
    const note = notes.find((n) => n.id === noteGet[1]);
    if (!note) return json(res, 404, { error: "not found" });
    return json(res, 200, note);
  }

  // POST /api/notes — create note
  if (method === "POST" && p === "/api/notes") {
    const body = await parseBody(req);
    const data = readNotes();
    const note = {
      id: uid(),
      title: body.title || "Untitled",
      icon: body.icon || "",
      content: body.content || "",
      tags: sanitizeTags(body.tags),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.notes.unshift(note);
    writeNotes(data);
    return json(res, 201, note);
  }

  // PUT /api/notes/:id — update note
  const notePut = p.match(/^\/api\/notes\/([^/]+)$/);
  if (method === "PUT" && notePut) {
    const body = await parseBody(req);
    const data = readNotes();
    const note = data.notes.find((n) => n.id === notePut[1]);
    if (!note) return json(res, 404, { error: "not found" });
    if (body.title !== undefined) note.title = body.title;
    if (body.icon !== undefined) note.icon = body.icon;
    if (body.content !== undefined) note.content = body.content;
    if (body.tags !== undefined) note.tags = sanitizeTags(body.tags);
    note.updatedAt = new Date().toISOString();
    writeNotes(data);
    return json(res, 200, note);
  }

  // DELETE /api/notes/:id
  const noteDel = p.match(/^\/api\/notes\/([^/]+)$/);
  if (method === "DELETE" && noteDel) {
    const data = readNotes();
    const idx = data.notes.findIndex((n) => n.id === noteDel[1]);
    if (idx === -1) return json(res, 404, { error: "not found" });
    data.notes.splice(idx, 1);
    writeNotes(data);
    return json(res, 200, { deleted: noteDel[1] });
  }

  // POST /api/notes/:id/summarize — AI summarize (stub: returns first 200 chars)
  const summarize = p.match(/^\/api\/notes\/([^/]+)\/summarize$/);
  if (method === "POST" && summarize) {
    const { notes } = readNotes();
    const note = notes.find((n) => n.id === summarize[1]);
    if (!note) return json(res, 404, { error: "not found" });
    console.log(`[ai-summarize] Note "${note.title}" (${note.id}), ${note.content.length} chars`);
    // Stub: real integration would POST to OpenClaw/LLM
    const summary = note.content.length > 200
      ? note.content.substring(0, 200) + "…"
      : note.content || "(empty note)";
    return json(res, 200, { summary, noteId: note.id });
  }

  json(res, 404, { error: "not found" });
}

const server = http.createServer(handleRequest);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Belagent API on http://127.0.0.1:${PORT}`);
  console.log(`Kanban: ${KANBAN_FILE}`);
  console.log(`Notes:  ${NOTES_FILE}`);
});
