import "./todo.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { request, STORAGE_KEY, type Task } from "./storage";
import { Button, Checkbox, Icon, InputGroup, NonIdealState, Spinner } from "@blueprintjs/core";

type Filter = "all" | "active" | "completed";
type Tool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };
type ModelDocument = Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } };

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const locked = useRef(false);
  const stateRef = useRef({ tasks, loaded });
  useEffect(() => { stateRef.current = { tasks, loaded }; }, [tasks, loaded]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const next = await request("GET"); stateRef.current = { tasks: next, loaded: true }; setTasks(next); setLoaded(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load tasks."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    request("GET").then(next => { if (active) { stateRef.current = { tasks: next, loaded: true }; setTasks(next); setLoaded(true); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load tasks."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) void load(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [load]);

  const mutate = useCallback(async (method: string, payload: object, message: string) => {
    if (locked.current || !stateRef.current.loaded) throw new Error("Please wait for your tasks to finish loading or saving.");
    locked.current = true; setBusy(true); setError("");
    try {
      const next = await request(method, payload);
      stateRef.current = { tasks: next, loaded: true };
      flushSync(() => { setTasks(next); setNotice(message); });
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
      throw e;
    } finally { locked.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    const context = (document as ModelDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const object = (input: unknown): Record<string, unknown> => {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected an object.");
      return input as Record<string, unknown>;
    };
    const title = (value: unknown) => {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 500) throw new Error("Use a task title of 1–500 characters.");
      return value.trim();
    };
    const id = (value: unknown) => {
      if (typeof value !== "string" || !stateRef.current.tasks.some(t => t.id === value)) throw new Error("Task not found.");
      return value;
    };
    const register = (tool: Tool) => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(console.error); } catch (e) { console.error(e); }
    };
    register({ name: "list_tasks", title: "List tasks", description: "Read all saved tasks, including completed tasks.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => {
      if (!stateRef.current.loaded) throw new Error("Tasks are still loading.");
      return { tasks: stateRef.current.tasks };
    } });
    register({ name: "add_task", title: "Add a task", description: "Create and save a task in the visible task list.", inputSchema: { type: "object", properties: { title: { type: "string", minLength: 1, maxLength: 500 } }, required: ["title"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async input => ({ tasks: await mutate("POST", { title: title(object(input).title) }, "Task added.") }) });
    register({ name: "update_task", title: "Update a task", description: "Rename a saved task or set its completion status.", inputSchema: { type: "object", properties: { id: { type: "string" }, title: { type: "string", minLength: 1, maxLength: 500 }, completed: { type: "boolean" } }, required: ["id"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async input => {
      const data = object(input); const payload: Record<string, unknown> = { id: id(data.id) };
      if (data.title !== undefined) payload.title = title(data.title);
      if (data.completed !== undefined) { if (typeof data.completed !== "boolean") throw new Error("completed must be a boolean."); payload.completed = data.completed; }
      if (Object.keys(payload).length === 1) throw new Error("Provide a title or completion status.");
      return { tasks: await mutate("PATCH", payload, "Task updated.") };
    } });
    register({ name: "delete_task", title: "Delete a task", description: "Permanently delete a task from the saved list.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async input => ({ tasks: await mutate("DELETE", { id: id(object(input).id) }, "Task deleted.") }) });
    return () => lifecycle.abort();
  }, [mutate]);

  const active = tasks.filter(t => !t.completed).length;
  const completed = tasks.length - active;
  const visible = tasks.filter(t => filter === "all" || (filter === "completed" ? t.completed : !t.completed));
  const disabled = busy || !loaded;
  async function addTask(event: React.FormEvent) {
    event.preventDefault(); if (!draft.trim() || disabled) return;
    try { await mutate("POST", { title: draft.trim() }, "Task added."); setDraft(""); setFilter("all"); inputRef.current?.focus(); } catch { /* preserve draft for retry */ }
  }
  async function saveTask(event: React.FormEvent) {
    event.preventDefault(); if (!editTitle.trim() || !editing) return;
    try { await mutate("PATCH", { id: editing, title: editTitle.trim() }, "Task updated."); setEditing(null); } catch { /* preserve edit for retry */ }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="To-do home"><span className="brand-mark"><Icon icon="tick" size={19} /></span><span>To-do</span></a>
        <span className="topbar-note"><Icon icon="lock" size={13} /> Your personal task list</span>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div><p className="eyebrow">A little focus goes a long way</p><h1>My tasks<span className="title-dot">.</span></h1><p className="subtitle">Make room for what matters. One task at a time.</p></div>
          {loaded && <div className="progress-summary"><span className="progress-number">{active}</span><span>{active === 1 ? "task to go" : "tasks to go"}</span></div>}
        </div>
        <section className="task-panel" aria-label="Task manager">
          <form className="add-form" onSubmit={addTask}>
            <label className="sr-only" htmlFor="new-task">New task</label>
            <InputGroup id="new-task" inputRef={inputRef} size="large" fill leftIcon="plus" placeholder="What needs to get done?" value={draft} onValueChange={setDraft} maxLength={500} autoComplete="off" disabled={busy} />
            <Button intent="primary" size="large" type="submit" disabled={disabled || !draft.trim()} loading={busy && !editing}>Add task</Button>
          </form>
          <div className="list-toolbar">
            <div className="filters" role="group" aria-label="Filter tasks">
              {(["all", "active", "completed"] as Filter[]).map(value => <Button key={value} variant="minimal" active={filter === value} intent={filter === value ? "primary" : "none"} aria-pressed={filter === value} onClick={() => setFilter(value)}><span>{value === "all" ? "All tasks" : value === "active" ? "Active" : "Completed"}</span><span className="filter-count">{loaded ? (value === "all" ? tasks.length : value === "active" ? active : completed) : "–"}</span></Button>)}
            </div>
            <span className="list-meta">{loaded ? `${tasks.length} total` : ""}</span>
          </div>
          {error && <div className="error-banner" role="alert"><Icon icon="error" /><span>{error}</span><Button variant="minimal" intent="danger" onClick={() => void load()} disabled={busy}>Retry</Button></div>}
          <div className="task-content" aria-busy={loading || busy}>
            {loading ? <div className="loading-state"><Spinner size={25} /><span>Loading your tasks…</span></div> : !loaded ? <NonIdealState icon="error" title="Your tasks are unavailable" description="Try loading them again in a moment." action={<Button onClick={() => void load()}>Reload tasks</Button>} /> : visible.length === 0 ? <NonIdealState className="empty-state" icon={filter === "completed" ? "endorsed" : filter === "active" && tasks.length ? "tick-circle" : "clipboard"} title={filter === "completed" ? "Every finish starts somewhere" : filter === "active" && tasks.length ? "You're all caught up" : "A clear list. A fresh start."} description={filter === "completed" ? "Tasks you check off will appear here." : filter === "active" && tasks.length ? "Enjoy the space, or add your next task above." : "Add your first task above and take it from there."} /> : <ul className="task-list">{visible.map(task => <li key={task.id} className={`task-row ${task.completed ? "is-complete" : ""}`}>
              <Checkbox className="task-checkbox" checked={task.completed} disabled={disabled || editing === task.id} aria-label={`${task.completed ? "Mark active" : "Complete"}: ${task.title}`} onChange={() => void mutate("PATCH", { id: task.id, completed: !task.completed }, task.completed ? "Task marked active." : "Task completed.").catch(() => {})} />
              {editing === task.id ? <form className="edit-form" onSubmit={saveTask}><InputGroup autoFocus aria-label="Edit task title" value={editTitle} onValueChange={setEditTitle} maxLength={500} disabled={busy} onKeyDown={event => { if (event.key === "Escape") setEditing(null); }} /><Button type="submit" intent="primary" icon="tick" aria-label="Save task" disabled={!editTitle.trim() || busy} /><Button variant="minimal" icon="cross" aria-label="Cancel editing" onClick={() => setEditing(null)} disabled={busy} /></form> : <><span className="task-title">{task.title}</span><div className="row-actions"><Button variant="minimal" icon="edit" aria-label={`Edit: ${task.title}`} title="Edit task" disabled={disabled} onClick={() => { setEditing(task.id); setEditTitle(task.title); }} /><Button variant="minimal" icon="trash" aria-label={`Delete: ${task.title}`} title="Delete task" disabled={disabled} onClick={() => void mutate("DELETE", { id: task.id }, "Task deleted.").catch(() => {})} /></div></>}
            </li>)}</ul>}
          </div>
          <footer className="panel-footer"><span className="save-status"><span className={error ? "status-dot has-error" : "status-dot"} />{busy ? "Saving…" : error ? "Needs attention" : loaded ? "Saved in this browser" : "Connecting…"}</span><span>{completed > 0 ? `${completed} completed. Nice work.` : "No account. No device sync."}</span></footer>
        </section>
        <div className="workspace-footer"><span>Built with <a href="https://blueprintjs.com" target="_blank" rel="noreferrer">Blueprint</a></span><span><kbd>Enter</kbd> to add · <kbd>Esc</kbd> to cancel an edit</span></div>
        <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      </main>
    </div>
  );
}
