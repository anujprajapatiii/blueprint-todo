export type Task = { id: string; title: string; completed: boolean; createdAt: number };
export const STORAGE_KEY = "blueprint-todo.tasks.v1";
type TaskStorage = Pick<Storage, "getItem" | "setItem">;

function taskTitle(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 500) throw new Error("Use a task title of 1–500 characters.");
  return value.trim();
}
function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return typeof t.id === "string" && t.id.length > 0 && typeof t.title === "string" && t.title.trim().length > 0 && t.title.length <= 500 && typeof t.completed === "boolean" && typeof t.createdAt === "number" && Number.isFinite(t.createdAt);
}
function read(storage: TaskStorage): Task[] {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { throw new Error("Browser storage is unavailable. Allow site storage, then try again."); }
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isTask) || new Set(parsed.map(t => t.id)).size !== parsed.length) throw new Error("Invalid saved data");
    return parsed;
  } catch { throw new Error("Your saved tasks couldn't be read. The stored data has been kept unchanged."); }
}
export function createTaskStore(storage: TaskStorage, newId: () => string = () => crypto.randomUUID(), now: () => number = () => Date.now()) {
  return async (method: string, body?: object): Promise<Task[]> => {
    const tasks = read(storage);
    const data = (body ?? {}) as Record<string, unknown>;
    let next = tasks;
    if (method === "GET") return tasks;
    if (method === "POST") {
      next = [{ id: newId(), title: taskTitle(data.title), completed: false, createdAt: now() }, ...tasks];
    } else if (method === "PATCH" || method === "DELETE") {
      if (typeof data.id !== "string" || !tasks.some(t => t.id === data.id)) throw new Error("That task no longer exists. Reload your list.");
      if (method === "DELETE") next = tasks.filter(t => t.id !== data.id);
      else {
        if (data.title === undefined && data.completed === undefined) throw new Error("Choose a task change.");
        if (data.completed !== undefined && typeof data.completed !== "boolean") throw new Error("Completion must be true or false.");
        const title = data.title === undefined ? undefined : taskTitle(data.title);
        next = tasks.map(t => t.id === data.id ? { ...t, title: title ?? t.title, completed: typeof data.completed === "boolean" ? data.completed : t.completed } : t);
      }
    } else throw new Error("Unsupported task action.");
    try { storage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { throw new Error("Your change wasn't saved. Browser storage may be full or blocked. Your previous list is unchanged."); }
    return next;
  };
}
export async function request(method: string, body?: object): Promise<Task[]> {
  let storage: Storage;
  try { storage = window.localStorage; }
  catch { throw new Error("Browser storage is unavailable. Allow site storage, then try again."); }
  return createTaskStore(storage)(method, body);
}
