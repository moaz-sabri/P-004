/**
 * Store / State Management (100% Local, Multi-page Compatible)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;
  var T = global.StudioTemplates;

  var STORAGE_KEY = "mazen-planner-v2";
  var LEGACY_STORAGE_KEY = "mazen-planner-v1";

  function Store() {
    this.state = this._loadState();
    this.subscribers = [];
  }

  Store.prototype._loadState = function () {
    try {
      var savedV2 = localStorage.getItem(STORAGE_KEY);
      if (savedV2) {
        return JSON.parse(savedV2);
      }

      var savedV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (savedV1) {
        var v1Data = JSON.parse(savedV1);
        var migrated = {
          version: 2,
          theme: "auto",
          projects: Array.isArray(v1Data.projects) ? v1Data.projects : [],
          items: Array.isArray(v1Data.items) ? v1Data.items : []
        };
        this._saveToStorage(migrated);
        return migrated;
      }
    } catch (e) {
      console.error("Storage load error:", e);
    }

    var initial = T.getInitialSeedData();
    this._saveToStorage(initial);
    return initial;
  };

  Store.prototype._saveToStorage = function (state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state || this.state));
    } catch (e) {
      console.error("Storage save error:", e);
    }
  };

  Store.prototype._notify = function () {
    this._saveToStorage();
    for (var i = 0; i < this.subscribers.length; i++) {
      try {
        this.subscribers[i](this.state);
      } catch (e) {
        console.error("Subscriber error:", e);
      }
    }
  };

  Store.prototype.subscribe = function (cb) {
    this.subscribers.push(cb);
    var self = this;
    return function () {
      self.subscribers = self.subscribers.filter(function (s) { return s !== cb; });
    };
  };

  Store.prototype.getTheme = function () {
    return this.state.theme || "auto";
  };

  Store.prototype.setTheme = function (theme) {
    this.state.theme = theme;
    this._notify();
  };

  Store.prototype.getProjects = function () {
    return this.state.projects ? this.state.projects.slice() : [];
  };

  Store.prototype.getProject = function (id) {
    var list = this.state.projects || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  };

  Store.prototype.addProject = function (params) {
    var name = (params.name || "").trim();
    var client = (params.client || "").trim();
    var due = params.due || "";
    var generateTasks = params.generateTasks !== false;

    var newProj = {
      id: U.generateId(),
      name: name,
      client: client,
      phase: 0,
      due: due
    };

    this.state.projects.push(newProj);

    if (generateTasks) {
      var today = U.getTodayIso();
      var duration = newProj.due ? Math.max(U.daysDifference(newProj.due, today), 7) : 28;

      for (var j = 0; j < T.PROJECT_TASK_TEMPLATES.length; j++) {
        var tpl = T.PROJECT_TASK_TEMPLATES[j];
        var offsetDays = Math.round(duration * tpl[2]);
        this.state.items.push({
          id: U.generateId(),
          title: tpl[1],
          kind: tpl[0],
          date: U.addDaysIso(offsetDays, today),
          time: "",
          pid: newProj.id,
          who: newProj.client || "",
          phone: "",
          done: false
        });
      }
    }

    this._notify();
    return newProj;
  };

  Store.prototype.updateProject = function (id, updates) {
    var proj = this.getProject(id);
    if (!proj) return null;
    for (var key in updates) {
      if (updates.hasOwnProperty(key)) {
        proj[key] = updates[key];
      }
    }
    this._notify();
    return proj;
  };

  Store.prototype.changeProjectPhase = function (id, newPhase) {
    var proj = this.getProject(id);
    if (proj) {
      proj.phase = Number(newPhase);
      this._notify();
    }
  };

  Store.prototype.deleteProject = function (id, deleteAssociatedTasks) {
    this.state.projects = (this.state.projects || []).filter(function (p) { return p.id !== id; });
    if (deleteAssociatedTasks) {
      this.state.items = (this.state.items || []).filter(function (i) { return i.pid !== id; });
    }
    this._notify();
  };

  Store.prototype.getItems = function () {
    return this.state.items ? this.state.items.slice() : [];
  };

  Store.prototype.getItem = function (id) {
    var list = this.state.items || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  };

  Store.prototype.addItem = function (params) {
    var newItem = {
      id: U.generateId(),
      title: (params.title || "").trim(),
      kind: params.kind || "task",
      date: params.date || U.getTodayIso(),
      time: params.time || "",
      pid: params.pid || "",
      who: (params.who || "").trim(),
      phone: (params.phone || "").trim(),
      done: false
    };

    this.state.items.push(newItem);
    this._notify();
    return newItem;
  };

  Store.prototype.updateItem = function (id, updates) {
    var item = this.getItem(id);
    if (!item) return null;
    for (var key in updates) {
      if (updates.hasOwnProperty(key)) {
        item[key] = updates[key];
      }
    }
    this._notify();
    return item;
  };

  Store.prototype.toggleItemDone = function (id) {
    var item = this.getItem(id);
    if (item) {
      item.done = !item.done;
      this._notify();
    }
  };

  Store.prototype.deleteItem = function (id) {
    this.state.items = (this.state.items || []).filter(function (i) { return i.id !== id; });
    this._notify();
  };

  Store.prototype.getUnifiedItems = function (options) {
    options = options || {};
    var kind = options.kind || "all";
    var query = (options.query || "").trim().toLowerCase();
    var projectId = options.projectId || "";

    var list = (this.state.items || []).map(function (item) {
      var copy = {};
      for (var k in item) { copy[k] = item[k]; }
      copy.source = "item";
      return copy;
    });

    var projects = this.state.projects || [];
    for (var p = 0; p < projects.length; p++) {
      var proj = projects[p];
      if (proj.phase < 3 && proj.due) {
        list.push({
          id: "del-" + proj.id,
          title: "تسليم: " + proj.name,
          kind: "delivery",
          date: proj.due,
          time: "",
          pid: proj.id,
          who: proj.client || "",
          phone: "",
          done: false,
          source: "project-delivery"
        });
      }
    }

    if (kind && kind !== "all") {
      list = list.filter(function (i) { return i.kind === kind; });
    }

    if (projectId) {
      list = list.filter(function (i) { return i.pid === projectId; });
    }

    if (query) {
      var self = this;
      list = list.filter(function (i) {
        var titleMatch = (i.title || "").toLowerCase().indexOf(query) !== -1;
        var whoMatch = (i.who || "").toLowerCase().indexOf(query) !== -1;
        var phoneMatch = (i.phone || "").toLowerCase().indexOf(query) !== -1;
        var prj = self.getProject(i.pid);
        var projMatch = prj ? (prj.name || "").toLowerCase().indexOf(query) !== -1 : false;
        return titleMatch || whoMatch || phoneMatch || projMatch;
      });
    }

    return list;
  };

  Store.prototype.getStats = function () {
    var today = U.getTodayIso();
    var openItems = this.getUnifiedItems().filter(function (i) { return !i.done; });

    var todayCount = openItems.filter(function (i) { return i.date === today; }).length;
    var weekCount = openItems.filter(function (i) {
      var diff = U.daysDifference(i.date, today);
      return diff >= 0 && diff <= 7;
    }).length;
    var lateCount = openItems.filter(function (i) { return i.date < today; }).length;
    var activeProjects = (this.state.projects || []).filter(function (p) { return p.phase < 3; }).length;

    return {
      today: todayCount,
      week: weekCount,
      late: lateCount,
      activeProjects: activeProjects
    };
  };

  Store.prototype.getProjectStats = function (projectId) {
    var allProjTasks = (this.state.items || []).filter(function (i) { return i.pid === projectId; });
    var total = allProjTasks.length;
    var completed = allProjTasks.filter(function (i) { return i.done; }).length;
    var percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    var open = total - completed;

    return { total: total, completed: completed, percentage: percentage, open: open };
  };

  Store.prototype.exportData = function () {
    return JSON.stringify(this.state, null, 2);
  };

  Store.prototype.importData = function (jsonString) {
    try {
      var parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.items)) {
        throw new Error("تنسيق الملف غير صالح.");
      }
      this.state = {
        version: 2,
        theme: parsed.theme || "auto",
        projects: parsed.projects,
        items: parsed.items
      };
      this._notify();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  Store.prototype.resetDefaults = function () {
    this.state = T.getInitialSeedData();
    this._notify();
  };

  global.StudioStore = new Store();
})(window);
