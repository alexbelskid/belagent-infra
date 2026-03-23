import { html, nothing } from "lit";

export type Task = {
  id: string;
  text: string;
  status: "todo" | "doing" | "done";
  createdAt?: number;
};

export type TasksProps = {
  loading: boolean;
  tasks: Task[];
  newTaskText: string;
  saving: boolean;
  onAdd: () => void;
  onTextChange: (text: string) => void;
  onStatusChange: (task: Task, status: Task["status"]) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
};

function taskIcon(status: Task["status"]) {
  if (status === "todo") return "○";
  if (status === "doing") return "◎";
  return "●";
}

function nextStatus(status: Task["status"]): Task["status"] {
  if (status === "todo") return "doing";
  if (status === "doing") return "done";
  return "todo";
}

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "К выполнению",
  doing: "В процессе",
  done: "Готово",
};

const STATUS_COLORS: Record<Task["status"], string> = {
  todo: "var(--oc-color-text-3, #6b7280)",
  doing: "#eab308",
  done: "#22c55e",
};

export function renderTasks(props: TasksProps) {
  const { loading, tasks, newTaskText, saving, onAdd, onTextChange, onStatusChange, onDelete, onRefresh } = props;

  const todo = tasks.filter(t => t.status === "todo");
  const doing = tasks.filter(t => t.status === "doing");
  const done = tasks.filter(t => t.status === "done");

  function renderTask(task: Task) {
    return html`
      <div class="task-item" data-status=${task.status}>
        <button
          class="task-toggle"
          style="color: ${STATUS_COLORS[task.status]}"
          title="Изменить статус"
          @click=${() => onStatusChange(task, nextStatus(task.status))}
        >${taskIcon(task.status)}</button>
        <span class="task-text ${task.status === "done" ? "task-done" : ""}">${task.text}</span>
        <button class="task-delete" @click=${() => onDelete(task)} title="Удалить">×</button>
      </div>
    `;
  }

  function renderColumn(title: string, items: Task[], status: Task["status"]) {
    return html`
      <div class="task-col">
        <div class="task-col-header" style="border-color: ${STATUS_COLORS[status]}">
          <span>${title}</span>
          <span class="task-col-count">${items.length}</span>
        </div>
        <div class="task-col-body">
          ${items.length === 0
            ? html`<div class="task-empty">Пусто</div>`
            : items.map(renderTask)
          }
        </div>
      </div>
    `;
  }

  return html`
    <div class="tasks-root">
      <style>
        .tasks-root { max-width: 1000px; }

        .tasks-add {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }
        .tasks-input {
          flex: 1;
          background: var(--oc-color-bg-2, #1c1c27);
          border: 1px solid var(--oc-color-border, #2a2a3d);
          border-radius: 10px;
          padding: 10px 14px;
          color: var(--oc-color-text-1, #e2e2f0);
          font-size: 13px;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s;
        }
        .tasks-input:focus { border-color: var(--oc-color-accent, #6366f1); }
        .tasks-input::placeholder { color: var(--oc-color-text-3, #6b7280); }
        .tasks-add-btn {
          padding: 10px 20px;
          background: var(--oc-color-accent, #6366f1);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .tasks-add-btn:hover { opacity: 0.85; }
        .tasks-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .tasks-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 700px) {
          .tasks-board { grid-template-columns: 1fr; }
        }

        .task-col {
          background: var(--oc-color-bg-2, #1c1c27);
          border: 1px solid var(--oc-color-border, #2a2a3d);
          border-radius: 12px;
          overflow: hidden;
        }
        .task-col-header {
          padding: 12px 16px;
          border-bottom: 2px solid;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 600;
        }
        .task-col-count {
          background: var(--oc-color-bg-3, #13131a);
          border-radius: 20px;
          padding: 1px 8px;
          font-size: 11px;
          color: var(--oc-color-text-3, #6b7280);
        }
        .task-col-body { padding: 8px; }
        .task-empty {
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: var(--oc-color-text-3, #6b7280);
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          margin-bottom: 4px;
          background: var(--oc-color-bg-3, #13131a);
          border: 1px solid transparent;
          transition: border-color 0.1s;
          group: task;
        }
        .task-item:hover { border-color: var(--oc-color-border, #2a2a3d); }

        .task-toggle {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0;
          flex-shrink: 0;
          transition: transform 0.1s;
        }
        .task-toggle:hover { transform: scale(1.2); }

        .task-text {
          flex: 1;
          font-size: 13px;
          line-height: 1.4;
          word-break: break-word;
        }
        .task-done {
          text-decoration: line-through;
          color: var(--oc-color-text-3, #6b7280);
        }

        .task-delete {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: var(--oc-color-text-3, #6b7280);
          opacity: 0;
          padding: 0 2px;
          transition: opacity 0.1s, color 0.1s;
          flex-shrink: 0;
        }
        .task-item:hover .task-delete { opacity: 1; }
        .task-delete:hover { color: #ef4444; }

        .tasks-refresh {
          background: var(--oc-color-bg-2, #1c1c27);
          border: 1px solid var(--oc-color-border, #2a2a3d);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          color: var(--oc-color-text-2, #a0a0b8);
          margin-bottom: 16px;
          transition: border-color 0.15s;
        }
        .tasks-refresh:hover { border-color: var(--oc-color-accent, #6366f1); }
      </style>

      <div class="tasks-add">
        <input
          type="text"
          class="tasks-input"
          placeholder="Добавить задачу..."
          .value=${newTaskText}
          @input=${(e: Event) => onTextChange((e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") onAdd(); }}
        />
        <button
          class="tasks-add-btn"
          ?disabled=${!newTaskText.trim() || saving}
          @click=${onAdd}
        >${saving ? "Сохранение..." : "+ Добавить"}</button>
      </div>

      ${loading
        ? html`<div style="padding:40px;text-align:center;color:var(--oc-color-text-3)">Загрузка задач...</div>`
        : html`
          <div class="tasks-board">
            ${renderColumn("К выполнению", todo, "todo")}
            ${renderColumn("В процессе", doing, "doing")}
            ${renderColumn("Готово", done, "done")}
          </div>
        `
      }
    </div>
  `;
}

// Parse tasks from markdown file
export function parseTasksFromMarkdown(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split("\n");
  let id = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // [ ] todo
    if (trimmed.match(/^- \[ \] /)) {
      tasks.push({ id: String(++id), text: trimmed.slice(6).trim(), status: "todo" });
    }
    // [-] doing / [~] doing
    else if (trimmed.match(/^- \[-\] |^- \[~\] |^- \[\/\] /)) {
      tasks.push({ id: String(++id), text: trimmed.slice(6).trim(), status: "doing" });
    }
    // [x] done
    else if (trimmed.match(/^- \[x\] /i)) {
      tasks.push({ id: String(++id), text: trimmed.slice(6).trim(), status: "done" });
    }
  }
  return tasks;
}

// Serialize tasks back to markdown
export function serializeTasksToMarkdown(tasks: Task[], existingContent: string): string {
  // Keep non-task lines (headers etc)
  const lines = existingContent.split("\n");
  const nonTaskLines = lines.filter(l => {
    const t = l.trim();
    return !t.match(/^- \[[ x\-~\/]\] /i);
  });

  const header = nonTaskLines.join("\n").trim() || "# Задачи";
  const taskLines = tasks.map(t => {
    const box = t.status === "done" ? "[x]" : t.status === "doing" ? "[-]" : "[ ]";
    return `- ${box} ${t.text}`;
  });

  return header + "\n\n" + taskLines.join("\n") + "\n";
}
