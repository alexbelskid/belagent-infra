---
name: appflowy-taskboard
description: Manage tasks and documents in AppFlowy Cloud using the appflowy MCP server. Create, update, and query project boards, task databases, and notes.
---

# AppFlowy Taskboard

Manage tasks, databases, and kanban boards in AppFlowy Cloud.
The `appflowy` MCP server provides programmatic CRUD access.

## Available MCP Tools

### Discovery
- `appflowy.list_workspaces` — List all workspaces (get workspace_id first)
- `appflowy.list_databases workspace_id=<id>` — List databases/boards in a workspace
- `appflowy.get_database_fields workspace_id=<id> database_id=<id>` — Get column definitions

### Read
- `appflowy.list_rows workspace_id=<id> database_id=<id>` — List all rows (tasks)
- `appflowy.get_row_detail workspace_id=<id> database_id=<id> row_ids=["id1","id2"]` — Full row details

### Write
- `appflowy.create_row workspace_id=<id> database_id=<id> data={"Title":"...","Status":"To Do"}` — Create task
- `appflowy.update_row workspace_id=<id> database_id=<id> row_id=<id> data={"Status":"Done"}` — Update task

## Common Workflows

### Create a new task
```
1. appflowy.list_workspaces → get workspace_id
2. appflowy.list_databases workspace_id=<ws> → find the task board
3. appflowy.get_database_fields workspace_id=<ws> database_id=<db> → see available fields
4. appflowy.create_row workspace_id=<ws> database_id=<db> data={"Title":"Fix login bug","Status":"To Do","Priority":"High"}
```

### List all tasks and their statuses
```
1. appflowy.list_rows workspace_id=<ws> database_id=<db> → get row IDs
2. appflowy.get_row_detail workspace_id=<ws> database_id=<db> row_ids=[...all IDs...]
```

### Move a task to Done
```
appflowy.update_row workspace_id=<ws> database_id=<db> row_id=<row> data={"Status":"Done"}
```

### Review tasks created by user
```
1. appflowy.list_rows → get all rows
2. appflowy.get_row_detail → check "Created By" or "Source" field
3. Filter for user-created tasks that need attention
```

## Data Model

- **Workspace** — Top-level container (one per client)
- **Database** — A table/board with fields (columns) and rows
- **Field** — Column definition (text, select, date, checkbox, number, etc.)
- **Row** — One task/record with values for each field
- **View** — Board (kanban), Grid (table), or Calendar layout of the same database

## Authentication

Auth is automatic — the MCP server uses a pre-configured service account
(`agent@local.belagent`). No manual login needed.

## Notes

- The API returns rows in no guaranteed order; sort client-side if needed.
- Rich text documents use Y-CRDT encoding and are not fully accessible via REST API.
  Use the web UI for document editing; use databases for structured task management.
- Changes made by the user in AppFlowy web UI are immediately visible via the API.
- Changes made via the API appear in the web UI in real-time.
