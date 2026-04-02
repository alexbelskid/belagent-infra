const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Config ──────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
const DATA_FILE = process.env.KANBAN_DATA ||
  path.join(__dirname, "..", "data", "kanban.json");

// ── Helpers ─────────────────────────────────────────────────────
function uid() {
  return crypto.randomBytes(6).toString("hex");
}

function readBoard() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    const seed = {
      columns: [
        { id: "todo",        title: "To Do",        order: 0 },
        { id: "in-progress", title: "In Progress",  order: 1 },
        { id: "done",        title: "Done",          order: 2 },
      ],
      cards: [],
    };
    writeBoard(seed);
    return seed;
  }
}

function writeBoard(board) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(board, null, 2));
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
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

// ── Routes ──────────────────────────────────────────────────────
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return json(res, 204, null);
  }

  // GET /api/kanban — full board
  if (method === "GET" && p === "/api/kanban") {
    return json(res, 200, readBoard());
  }

  // POST /api/kanban/columns — add column
  if (method === "POST" && p === "/api/kanban/columns") {
    const body = await parseBody(req);
    if (!body.title) return json(res, 400, { error: "title required" });
    const board = readBoard();
    const maxOrder = board.columns.reduce((m, c) => Math.max(m, c.order), -1);
    const col = { id: uid(), title: body.title, order: maxOrder + 1 };
    board.columns.push(col);
    writeBoard(board);
    return json(res, 201, col);
  }

  // PUT /api/kanban/columns/:id — rename column
  const colPut = p.match(/^\/api\/kanban\/columns\/([^/]+)$/);
  if (method === "PUT" && colPut) {
    const body = await parseBody(req);
    const board = readBoard();
    const col = board.columns.find((c) => c.id === colPut[1]);
    if (!col) return json(res, 404, { error: "column not found" });
    if (body.title !== undefined) col.title = body.title;
    if (body.order !== undefined) col.order = body.order;
    writeBoard(board);
    return json(res, 200, col);
  }

  // DELETE /api/kanban/columns/:id — delete column (cards in it get deleted too)
  const colDel = p.match(/^\/api\/kanban\/columns\/([^/]+)$/);
  if (method === "DELETE" && colDel) {
    const board = readBoard();
    const idx = board.columns.findIndex((c) => c.id === colDel[1]);
    if (idx === -1) return json(res, 404, { error: "column not found" });
    // Prevent deleting the last column
    if (board.columns.length <= 1) {
      return json(res, 400, { error: "cannot delete last column" });
    }
    const removed = board.columns.splice(idx, 1)[0];
    board.cards = board.cards.filter((c) => c.columnId !== removed.id);
    writeBoard(board);
    return json(res, 200, { deleted: removed.id });
  }

  // POST /api/kanban/cards — add card
  if (method === "POST" && p === "/api/kanban/cards") {
    const body = await parseBody(req);
    if (!body.title) return json(res, 400, { error: "title required" });
    const board = readBoard();
    const colId = body.columnId || (board.columns[0] && board.columns[0].id) || "todo";
    if (!board.columns.find((c) => c.id === colId)) {
      return json(res, 400, { error: "invalid columnId" });
    }
    const colCards = board.cards.filter((c) => c.columnId === colId);
    const maxOrder = colCards.reduce((m, c) => Math.max(m, c.order), -1);
    const card = {
      id: uid(),
      columnId: colId,
      title: body.title,
      description: body.description || "",
      assignee: body.assignee || "",
      priority: ["low", "mid", "high"].includes(body.priority) ? body.priority : "mid",
      createdAt: new Date().toISOString(),
      order: maxOrder + 1,
    };
    board.cards.push(card);
    writeBoard(board);
    return json(res, 201, card);
  }

  // PUT /api/kanban/cards/:id — update card (fields + move between columns)
  const cardPut = p.match(/^\/api\/kanban\/cards\/([^/]+)$/);
  if (method === "PUT" && cardPut) {
    const body = await parseBody(req);
    const board = readBoard();
    const card = board.cards.find((c) => c.id === cardPut[1]);
    if (!card) return json(res, 404, { error: "card not found" });
    if (body.title !== undefined)       card.title = body.title;
    if (body.description !== undefined) card.description = body.description;
    if (body.assignee !== undefined)    card.assignee = body.assignee;
    if (body.priority !== undefined && ["low", "mid", "high"].includes(body.priority)) {
      card.priority = body.priority;
    }
    if (body.columnId !== undefined) {
      if (!board.columns.find((c) => c.id === body.columnId)) {
        return json(res, 400, { error: "invalid columnId" });
      }
      card.columnId = body.columnId;
    }
    if (body.order !== undefined) card.order = body.order;
    writeBoard(board);
    return json(res, 200, card);
  }

  // DELETE /api/kanban/cards/:id
  const cardDel = p.match(/^\/api\/kanban\/cards\/([^/]+)$/);
  if (method === "DELETE" && cardDel) {
    const board = readBoard();
    const idx = board.cards.findIndex((c) => c.id === cardDel[1]);
    if (idx === -1) return json(res, 404, { error: "card not found" });
    const removed = board.cards.splice(idx, 1)[0];
    writeBoard(board);
    return json(res, 200, { deleted: removed.id });
  }

  // PUT /api/kanban/reorder — batch reorder cards after drag & drop
  if (method === "PUT" && p === "/api/kanban/reorder") {
    const body = await parseBody(req);
    // body: { cardId, targetColumnId, targetIndex }
    if (!body.cardId || !body.targetColumnId) {
      return json(res, 400, { error: "cardId and targetColumnId required" });
    }
    const board = readBoard();
    const card = board.cards.find((c) => c.id === body.cardId);
    if (!card) return json(res, 404, { error: "card not found" });
    if (!board.columns.find((c) => c.id === body.targetColumnId)) {
      return json(res, 400, { error: "invalid targetColumnId" });
    }
    // Remove from old position
    const oldCol = card.columnId;
    card.columnId = body.targetColumnId;
    // Reorder: get target column cards sorted
    const targetCards = board.cards
      .filter((c) => c.columnId === body.targetColumnId && c.id !== card.id)
      .sort((a, b) => a.order - b.order);
    const insertAt = typeof body.targetIndex === "number"
      ? Math.min(body.targetIndex, targetCards.length)
      : targetCards.length;
    targetCards.splice(insertAt, 0, card);
    targetCards.forEach((c, i) => { c.order = i; });
    // Reorder old column if different
    if (oldCol !== body.targetColumnId) {
      const oldCards = board.cards
        .filter((c) => c.columnId === oldCol)
        .sort((a, b) => a.order - b.order);
      oldCards.forEach((c, i) => { c.order = i; });
    }
    writeBoard(board);
    return json(res, 200, readBoard());
  }

  // 404 fallback
  json(res, 404, { error: "not found" });
}

// ── Server ──────────────────────────────────────────────────────
const server = http.createServer(handleRequest);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Kanban API listening on http://127.0.0.1:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
