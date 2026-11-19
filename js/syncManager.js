/**
 * Studio Planner - Offline-First Sync Manager
 * Handles local change queues, automatic background synchronization, 
 * conflict tracking, and network heartbeat.
 * Enforces account requirement for online sync, while preserving full local offline usage.
 */
(function (global) {
  "use strict";

  var QUEUE_KEY = "studio_sync_queue";
  var LAST_SYNC_KEY = "studio_last_sync_timestamp";
  var CONFLICTS_KEY = "studio_sync_conflicts";

  function SyncManager() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.queue = this._loadQueue();
    this.conflicts = this._loadConflicts();
    this.lastSyncTimestamp = parseInt(localStorage.getItem(LAST_SYNC_KEY) || "0", 10);
    this.listeners = [];

    this._initNetworkListeners();
    this._startPeriodicSync();
  }

  SyncManager.prototype._loadQueue = function () {
    try {
      var saved = localStorage.getItem(QUEUE_KEY);
      var queue = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(queue)) return [];
      // Migrate older queued changes so retries become idempotent.
      return queue.map(function (change) {
        if (!change.operation_id) {
          change.operation_id = change.id || ((typeof crypto !== "undefined" && crypto.randomUUID)
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2));
        }
        return change;
      });
    } catch (e) {
      return [];
    }
  };

  SyncManager.prototype._saveQueue = function () {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error("Failed to save sync queue:", e);
    }
  };

  SyncManager.prototype._loadConflicts = function () {
    try {
      var saved = localStorage.getItem(CONFLICTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  SyncManager.prototype._saveConflicts = function () {
    try {
      localStorage.setItem(CONFLICTS_KEY, JSON.stringify(this.conflicts));
    } catch (e) {
      console.error("Failed to save conflicts:", e);
    }
  };

  SyncManager.prototype._initNetworkListeners = function () {
    var self = this;
    window.addEventListener("online", function () {
      self.checkHealth().then(function (online) {
        self.isOnline = online;
        self._notify();
        if (online) self.sync();
      });
    });

    window.addEventListener("offline", function () {
      self.isOnline = false;
      self._notify();
    });

    this.checkHealth();
  };

  SyncManager.prototype.checkHealth = function () {
    var self = this;
    return fetch("/api/health", { method: "GET", cache: "no-store" })
      .then(function (res) {
        var ok = res.ok;
        if (self.isOnline !== ok) {
          self.isOnline = ok;
          self._notify();
        }
        return ok;
      })
      .catch(function () {
        if (self.isOnline !== false) {
          self.isOnline = false;
          self._notify();
        }
        return false;
      });
  };

  SyncManager.prototype._startPeriodicSync = function () {
    var self = this;
    setInterval(function () {
      var auth = global.StudioAuth;
      if (self.isOnline && auth && auth.isLoggedIn() && !self.isSyncing && (self.queue.length > 0 || (Date.now() - self.lastSyncTimestamp > 60000))) {
        self.sync();
      }
    }, 25000);
  };

  SyncManager.prototype.subscribe = function (fn) {
    this.listeners.push(fn);
    var self = this;
    return function () {
      self.listeners = self.listeners.filter(function (l) { return l !== fn; });
    };
  };

  SyncManager.prototype._notify = function () {
    var auth = global.StudioAuth;
    var isLoggedIn = auth ? auth.isLoggedIn() : false;
    var state = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      isLoggedIn: isLoggedIn,
      authRequiredForSync: this.isOnline && !isLoggedIn,
      pendingCount: this.queue.length,
      conflictsCount: this.conflicts.length,
      conflicts: this.conflicts,
      lastSyncTimestamp: this.lastSyncTimestamp
    };
    for (var i = 0; i < this.listeners.length; i++) {
      try {
        this.listeners[i](state);
      } catch (e) {
        console.error("Sync listener error:", e);
      }
    }
  };

  SyncManager.prototype.enqueueChange = function (entityType, entityId, action, payload) {
    var change = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      entity_type: entityType,
      entity_id: String(entityId),
      action: action,
      source: this.isOnline ? "online" : "offline",
      payload: payload || {},
      client_timestamp: Date.now()
    };
    change.operation_id = change.id;

    var existingIdx = -1;
    for (var i = 0; i < this.queue.length; i++) {
      if (this.queue[i].entity_type === entityType && this.queue[i].entity_id === String(entityId)) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx !== -1) {
      var prev = this.queue[existingIdx];
      if (prev.action === "create" && action === "update") {
        prev.payload = Object.assign({}, prev.payload, payload);
        prev.client_timestamp = change.client_timestamp;
      } else if (prev.action === "create" && action === "delete") {
        this.queue.splice(existingIdx, 1);
      } else if (action === "delete") {
        prev.action = "delete";
        prev.payload = {};
        prev.client_timestamp = change.client_timestamp;
      } else {
        prev.payload = Object.assign({}, prev.payload, payload);
        prev.client_timestamp = change.client_timestamp;
      }
    } else {
      this.queue.push(change);
    }

    this._saveQueue();
    this._notify();

    var auth = global.StudioAuth;
    if (this.isOnline && auth && auth.isLoggedIn() && !this.isSyncing) {
      this.sync();
    }
  };

  SyncManager.prototype.sync = function () {
    if (this.isSyncing) return Promise.resolve(null);
    var auth = global.StudioAuth;
    if (!auth || !auth.isLoggedIn()) {
      this._notify();
      return Promise.resolve({ auth_required: true });
    }

    var self = this;
    var U = global.StudioUtils;
    this.isSyncing = true;
    this._notify();

    var sendingChanges = this.queue.slice();
    var options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + auth.getToken(),
        "X-CSRF-Token": auth.getCsrfToken ? auth.getCsrfToken() : ""
      },
      credentials: "include",
      body: JSON.stringify({
        last_sync_timestamp: self.lastSyncTimestamp,
        changes: sendingChanges
      })
    };

    var fetcher = (U && U.safeFetchJson)
      ? U.safeFetchJson("/api/sync", options)
      : fetch("/api/sync", options).then(function (r) { return r.json(); });

    return fetcher
      .then(function (data) {
        self.isOnline = true;
        if (!data || !data.success) {
          throw new Error((data && data.error) ? data.error : "تعذر استكمال المزامنة");
        }

        var sentIds = sendingChanges.map(function (c) { return c.id; });
        self.queue = self.queue.filter(function (c) { return sentIds.indexOf(c.id) === -1; });
        self._saveQueue();

        if (data.server_timestamp) {
          self.lastSyncTimestamp = data.server_timestamp;
          localStorage.setItem(LAST_SYNC_KEY, String(data.server_timestamp));
        }

        self.conflicts = data.conflicts || [];
        self._saveConflicts();

        if (data.server_changes && global.StudioStore) {
          global.StudioStore.applyServerChanges(data.server_changes);
        }

        return data;
      })
      .catch(function (err) {
        console.warn("Background sync paused (offline or server unreachable):", err);
      })
      .finally(function () {
        self.isSyncing = false;
        self._notify();
      });
  };

  SyncManager.prototype.resolveConflict = function (conflictId, resolution, entityType, entityId, payload) {
    var auth = global.StudioAuth;
    if (!auth || !auth.isLoggedIn()) {
      return Promise.reject(new Error("يجب تسجيل الدخول لحسم التعارض"));
    }

    var self = this;
    var U = global.StudioUtils;
    var options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + auth.getToken(),
        "X-CSRF-Token": auth.getCsrfToken ? auth.getCsrfToken() : ""
      },
      credentials: "include",
      body: JSON.stringify({
        conflict_id: conflictId,
        resolution: resolution,
        entity_type: entityType,
        entity_id: entityId,
        payload: payload
      })
    };

    var fetcher = (U && U.safeFetchJson)
      ? U.safeFetchJson("/api/sync/resolve", options)
      : fetch("/api/sync/resolve", options).then(function (r) { return r.json(); });

    return fetcher
      .then(function (data) {
        if (!data || !data.success) {
          throw new Error((data && data.error) ? data.error : "فشل حسم التعارض");
        }
        self.conflicts = self.conflicts.filter(function (c) { return c.conflict_id !== conflictId; });
        self._saveConflicts();
        self._notify();
        self.sync();
        return data;
      });
  };

  global.StudioSync = new SyncManager();
})(window);
