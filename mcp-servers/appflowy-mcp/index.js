#!/usr/bin/env node
/**
 * AppFlowy MCP Server — stdio transport
 *
 * Provides tools for OpenClaw agents to manage AppFlowy Cloud databases:
 * - list_workspaces, list_databases, get_database_fields
 * - list_rows, get_row_detail, create_row, update_row
 *
 * Auth: GoTrue password grant → JWT (cached, auto-refresh on 401)
 *
 * Environment:
 *   APPFLOWY_URL           — AppFlowy base URL (e.g., http://localhost:8025)
 *   APPFLOWY_AGENT_EMAIL   — Service account email
 *   APPFLOWY_AGENT_PASSWORD — Service account password
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ── Config ──────────────────────────────────────────────────

const APPFLOWY_URL = process.env.APPFLOWY_URL || "http://localhost:8025";
const AGENT_EMAIL = process.env.APPFLOWY_AGENT_EMAIL || "agent@local.belagent";
const AGENT_PASSWORD = process.env.APPFLOWY_AGENT_PASSWORD;

if (!AGENT_PASSWORD) {
  console.error("APPFLOWY_AGENT_PASSWORD is required");
  process.exit(1);
}

// ── Auth ────────────────────────────────────────────────────

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch(
    `${APPFLOWY_URL}/gotrue/token?grant_type=password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: AGENT_EMAIL,
        password: AGENT_PASSWORD,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh 5 minutes before expiry
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

function invalidateToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

// ── API Client ──────────────────────────────────────────────

async function apiCall(path, options = {}) {
  const token = await getToken();
  const url = `${APPFLOWY_URL}/api${path}`;

  let res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    invalidateToken();
    const newToken = await getToken();
    res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${newToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${options.method || "GET"} ${path} failed (${res.status}): ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return await res.text();
}

// ── Tool Definitions ────────────────────────────────────────

const TOOLS = [
  {
    name: "list_workspaces",
    description:
      "List all workspaces accessible by the agent. Returns workspace IDs and names.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_databases",
    description:
      "List all databases (tables, kanban boards) in a workspace. Returns database IDs and names.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: {
          type: "string",
          description: "Workspace ID (from list_workspaces)",
        },
      },
      required: ["workspace_id"],
    },
  },
  {
    name: "get_database_fields",
    description:
      "Get field definitions (columns) of a database. Shows field names, types, and options.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID" },
        database_id: { type: "string", description: "Database ID (from list_databases)" },
      },
      required: ["workspace_id", "database_id"],
    },
  },
  {
    name: "list_rows",
    description:
      "List all rows in a database. Returns row IDs and basic data. Use get_row_detail for full content.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID" },
        database_id: { type: "string", description: "Database ID" },
      },
      required: ["workspace_id", "database_id"],
    },
  },
  {
    name: "get_row_detail",
    description:
      "Get full details of specific rows in a database. Returns all field values for each row.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID" },
        database_id: { type: "string", description: "Database ID" },
        row_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of row IDs to fetch (from list_rows)",
        },
      },
      required: ["workspace_id", "database_id", "row_ids"],
    },
  },
  {
    name: "create_row",
    description:
      "Create a new row in a database. Pass field values as key-value pairs matching field names.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID" },
        database_id: { type: "string", description: "Database ID" },
        data: {
          type: "object",
          description:
            'Field values as {field_name: value}. Example: {"Title": "New task", "Status": "To Do", "Priority": "High"}',
        },
      },
      required: ["workspace_id", "database_id", "data"],
    },
  },
  {
    name: "update_row",
    description:
      "Update an existing row in a database. Pass only the fields you want to change.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_id: { type: "string", description: "Workspace ID" },
        database_id: { type: "string", description: "Database ID" },
        row_id: { type: "string", description: "Row ID to update" },
        data: {
          type: "object",
          description:
            'Field values to update as {field_name: value}. Example: {"Status": "Done"}',
        },
      },
      required: ["workspace_id", "database_id", "row_id", "data"],
    },
  },
];

// ── Tool Handlers ───────────────────────────────────────────

async function handleTool(name, args) {
  switch (name) {
    case "list_workspaces": {
      const result = await apiCall("/workspace");
      return JSON.stringify(result, null, 2);
    }

    case "list_databases": {
      const { workspace_id } = args;
      const result = await apiCall(`/workspace/${workspace_id}/database`);
      return JSON.stringify(result, null, 2);
    }

    case "get_database_fields": {
      const { workspace_id, database_id } = args;
      const result = await apiCall(
        `/workspace/${workspace_id}/database/${database_id}/fields`
      );
      return JSON.stringify(result, null, 2);
    }

    case "list_rows": {
      const { workspace_id, database_id } = args;
      const result = await apiCall(
        `/workspace/${workspace_id}/database/${database_id}/row`
      );
      return JSON.stringify(result, null, 2);
    }

    case "get_row_detail": {
      const { workspace_id, database_id, row_ids } = args;
      const params = new URLSearchParams();
      for (const id of row_ids) {
        params.append("row_id", id);
      }
      const result = await apiCall(
        `/workspace/${workspace_id}/database/${database_id}/row/detail?${params}`
      );
      return JSON.stringify(result, null, 2);
    }

    case "create_row": {
      const { workspace_id, database_id, data } = args;
      const result = await apiCall(
        `/workspace/${workspace_id}/database/${database_id}/row`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      return JSON.stringify(result, null, 2);
    }

    case "update_row": {
      const { workspace_id, database_id, row_id, data } = args;
      const result = await apiCall(
        `/workspace/${workspace_id}/database/${database_id}/row`,
        {
          method: "PUT",
          body: JSON.stringify({ row_id, ...data }),
        }
      );
      return JSON.stringify(result, null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── MCP Server ──────────────────────────────────────────────

const server = new Server(
  { name: "appflowy-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, args || {});
    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ── Start ───────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
