const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

function createStorage(initial) {
  const values = new Map(Object.entries(initial || {}));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function loadManager(storage, fetchImpl) {
  const listeners = {};
  const window = {
    addEventListener: (name, fn) => { listeners[name] = fn; },
  };
  const context = {
    window,
    navigator: { onLine: false },
    localStorage: storage,
    setInterval: () => 0,
    clearInterval: () => {},
    fetch: fetchImpl || (() => Promise.resolve({ ok: false })),
    console,
    Date,
    Math,
    Promise,
    crypto: undefined,
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "syncManager.js"), "utf8");
  vm.runInContext(source, context);
  return { manager: context.window.StudioSync, window: context.window };
}

test("new queued changes receive an operation_id", () => {
  const storage = createStorage();
  const manager = loadManager(storage).manager;
  manager.enqueueChange("project", "p-1", "create", { name: "Test" });

  const queue = JSON.parse(storage.getItem("studio_sync_queue"));
  assert.equal(queue.length, 1);
  assert.equal(typeof queue[0].operation_id, "string");
  assert.equal(queue[0].operation_id, queue[0].id);
});

test("legacy queued changes are migrated with an operation_id", () => {
  const storage = createStorage({
    studio_sync_queue: JSON.stringify([{
      id: "legacy-id",
      entity_type: "item",
      entity_id: "i-1",
      action: "update",
      payload: {},
      client_timestamp: 1,
    }]),
  });
  const manager = loadManager(storage).manager;
  assert.equal(manager.queue[0].operation_id, "legacy-id");
});

test("failed sync rejects and preserves pending changes", async () => {
  const storage = createStorage();
  const { manager, window } = loadManager(storage, () => Promise.reject(new Error("network down")));
  manager.isOnline = true;
  manager.queue = [{ id: "op-1", operation_id: "op-1", entity_type: "item", entity_id: "i-1", action: "update", payload: {}, client_timestamp: 1 }];
  manager._notify = () => {};
  manager._saveQueue = () => {};
  window.StudioAuth = { isLoggedIn: () => true, getToken: () => "token", getCsrfToken: () => "csrf" };
  await assert.rejects(manager.sync(), /network down/);
  assert.equal(manager.queue.length, 1);
});
