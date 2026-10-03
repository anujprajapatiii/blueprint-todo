import test from "node:test";
import assert from "node:assert/strict";
import { createTaskStore, STORAGE_KEY } from "../src/storage.ts";
function memory(initial: string | null = null) {
  let raw = initial;
  return { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
}
test("tasks survive a new store instance, and support editing, completing, and deleting", async () => {
  const storage = memory();
  const store = createTaskStore(storage, () => "task-1", () => 100);
  assert.deepEqual(await store("GET"), []);
  await store("POST", { title: " First task " });
  const reloaded = createTaskStore(storage);
  assert.equal((await reloaded("GET"))[0].title, "First task");
  assert.deepEqual(await reloaded("PATCH", { id: "task-1", title: "Updated", completed: true }), [{ id: "task-1", title: "Updated", completed: true, createdAt: 100 }]);
  assert.deepEqual(await reloaded("DELETE", { id: "task-1" }), []);
});
test("invalid input and malformed saved data cannot overwrite the list", async () => {
  const storage = memory(); const store = createTaskStore(storage);
  await assert.rejects(store("POST", { title: " " }), /1–500/);
  assert.equal(storage.getItem(), null);
  storage.setItem(STORAGE_KEY, "broken");
  await assert.rejects(store("POST", { title: "Valid" }), /kept unchanged/);
  assert.equal(storage.getItem(), "broken");
});
test("blocked writes reject without reporting a successful save", async () => {
  const store = createTaskStore({ getItem: () => "[]", setItem: () => { throw new Error("QuotaExceededError"); } });
  await assert.rejects(store("POST", { title: "Draft" }), /wasn't saved/);
});
