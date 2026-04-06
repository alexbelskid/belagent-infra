---
name: kanban
description: "Read, search, and manage the Kanban board. Usage: /kanban [list|search|add|move|done] [args]. Examples: /kanban list, /kanban search vpn, /kanban add 'Fix login bug' --priority high --assignee Лёша, /kanban move <id> in-progress, /kanban done <id>"
user-invocable: true
---

# kanban — Read & Manage the Kanban Board

You interact with the Kanban board via the local JSON file or HTTP API.

## Data Location

The kanban data is stored at:
```
/root/.openclaw/workspace/belagent-infra/data/kanban.json
```

If the file doesn't exist or is empty, the board has no tasks yet.

The HTTP API is available at `http://127.0.0.1:3001/api/kanban` (backup method).

## Phase 1 — Parse Command

Parse the arguments after `/kanban`. Default command is `list`.

| Command | Description |
|---------|-------------|
| `list` | Show all tasks grouped by column |
| `search <query>` | Find tasks matching query in title/description/tags |
| `add <title>` | Create a new task |
| `move <id> <column>` | Move task to column (todo, in-progress, done) |
| `done <id>` | Mark task as done |
| `archive` | Archive all done tasks |
| `detail <id>` | Show full task details |

## Phase 2 — Read Board

Read the kanban data:

```bash
cat /root/.openclaw/workspace/belagent-infra/data/kanban.json
```

Parse the JSON. Structure:
```json
{
  "columns": [
    {"id": "todo", "title": "To Do", "order": 0},
    {"id": "in-progress", "title": "In Progress", "order": 1},
    {"id": "done", "title": "Done", "order": 2}
  ],
  "cards": [
    {
      "id": "abc123",
      "columnId": "todo",
      "title": "Fix login bug",
      "description": "Users can't log in after password reset",
      "assignee": "Лёша",
      "priority": "high",
      "deadline": "2026-04-10",
      "tags": ["bug", "auth"],
      "createdAt": "2026-04-03T12:00:00Z",
      "order": 0
    }
  ],
  "archive": []
}
```

## Phase 3 — Execute Command

### `list` (default)

Display tasks grouped by column. Format:

```
📋 Kanban Board

🔴 TO DO (3)
  • [abc123] Fix login bug — High 🔴 @Лёша (Apr 3)
  • [def456] Add dark mode — Mid 🟡 (Apr 3)

🟡 IN PROGRESS (1)
  • [ghi789] Deploy new UI — High 🔴 @Лёша (Apr 5)

✅ DONE (1)
  • [jkl012] Setup VPS — Mid 🟡 @Женя (Apr 2)
```

Priority indicators: high=🔴, mid=🟡, low=🟢

### `search <query>`

Search cards by title, description, tags, or assignee (case-insensitive). Show matching cards with their column.

### `add <title> [options]`

Create a new task via the API:

```bash
curl -s -X POST http://127.0.0.1:3001/api/kanban/cards \
  -H "Content-Type: application/json" \
  -d '{"title":"<title>","description":"<desc>","priority":"<low|mid|high>","assignee":"<name>","tags":["tag1"],"columnId":"todo"}'
```

Options:
- `--priority <low|mid|high>` (default: mid)
- `--assignee <name>`
- `--desc <description>`
- `--tags <tag1,tag2>`
- `--column <column-id>` (default: todo)
- `--deadline <YYYY-MM-DD>`

### `move <id> <column-id>`

Move a card to a different column:

```bash
curl -s -X PATCH http://127.0.0.1:3001/api/kanban/cards/<id>/status \
  -H "Content-Type: application/json" \
  -d '{"columnId":"<column-id>"}'
```

Column IDs: `todo`, `in-progress`, `done`

### `done <id>`

Shortcut for `move <id> done`.

### `archive`

Archive all completed tasks:

```bash
curl -s -X POST http://127.0.0.1:3001/api/kanban/archive-done
```

### `detail <id>`

Show full details of a specific card including description, tags, deadline, and creation date.

## Phase 4 — Confirm & Report

After executing the command:
- For read operations: display the formatted output
- For write operations: confirm the action was successful and show the updated state
- If an error occurs: show a clear error message

## Notes

- Card IDs are short hex strings (12 chars). You can match by prefix (first 4-6 chars).
- When the user refers to tasks by name, search for them and use the matching ID.
- Always read the current state before modifying to avoid stale data.
- The board is shared — multiple users may be viewing/editing.
