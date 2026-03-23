import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { Task } from "../views/tasks.ts";
import { parseTasksFromMarkdown, serializeTasksToMarkdown } from "../views/tasks.ts";

const TASKS_FILE = "memory/tasks.md";
const AGENT_ID = "main";

type GatewayApp = {
  send: (method: string, params: unknown) => Promise<unknown>;
};

export class TasksController implements ReactiveController {
  host: ReactiveControllerHost;
  app: GatewayApp;

  tasks: Task[] = [];
  loading = false;
  saving = false;
  newTaskText = "";
  rawContent = "";
  error: string | null = null;

  constructor(host: ReactiveControllerHost, app: GatewayApp) {
    this.host = host;
    this.app = app;
    host.addController(this);
  }

  hostConnected() {
    this.load();
  }

  hostDisconnected() {}

  async load() {
    this.loading = true;
    this.error = null;
    this.host.requestUpdate();

    try {
      const result = await this.app.send("agents.files.get", {
        agentId: AGENT_ID,
        name: TASKS_FILE,
      }) as { content?: string; text?: string } | null;

      const content = result?.content ?? result?.text ?? "";
      this.rawContent = content;
      this.tasks = parseTasksFromMarkdown(content);
    } catch (e) {
      // File might not exist yet — start empty
      this.rawContent = "# Задачи\n\n";
      this.tasks = [];
    }

    this.loading = false;
    this.host.requestUpdate();
  }

  async save() {
    this.saving = true;
    this.host.requestUpdate();

    try {
      const content = serializeTasksToMarkdown(this.tasks, this.rawContent);
      this.rawContent = content;
      await this.app.send("agents.files.set", {
        agentId: AGENT_ID,
        name: TASKS_FILE,
        content,
      });
    } catch (e) {
      console.error("Failed to save tasks:", e);
    }

    this.saving = false;
    this.host.requestUpdate();
  }

  addTask() {
    const text = this.newTaskText.trim();
    if (!text) return;

    const newTask: Task = {
      id: String(Date.now()),
      text,
      status: "todo",
      createdAt: Date.now(),
    };

    this.tasks = [newTask, ...this.tasks];
    this.newTaskText = "";
    this.save();
  }

  updateStatus(task: Task, status: Task["status"]) {
    this.tasks = this.tasks.map(t =>
      t.id === task.id ? { ...t, status } : t
    );
    this.save();
  }

  deleteTask(task: Task) {
    this.tasks = this.tasks.filter(t => t.id !== task.id);
    this.save();
  }

  setNewTaskText(text: string) {
    this.newTaskText = text;
    this.host.requestUpdate();
  }
}
