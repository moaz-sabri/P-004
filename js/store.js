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
        var state = JSON.parse(savedV2);
        if (!state.categories || !Array.isArray(state.categories) || state.categories.length === 0) {
          state.categories = JSON.parse(JSON.stringify(T.DEFAULT_CATEGORIES || []));
          this._saveToStorage(state);
        }
        if (!Array.isArray(state.clients)) {
          state.clients = [];
          this._saveToStorage(state);
        }
        if (!Array.isArray(state.projects)) state.projects = [];
        if (!Array.isArray(state.items)) state.items = [];
        return state;
      }

      var savedV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (savedV1) {
        var v1Data = JSON.parse(savedV1);
        var migrated = {
          version: 2,
          theme: "auto",
          clients: [],
          projects: Array.isArray(v1Data.projects) ? v1Data.projects : [],
          items: Array.isArray(v1Data.items) ? v1Data.items : [],
          categories: JSON.parse(JSON.stringify(T.DEFAULT_CATEGORIES || []))
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
    var cid = (params.cid || params.clientId || "").trim();
    var due = params.due || "";
    var generateTasks = params.generateTasks !== false;

    var newProj = {
      id: U.generateId(),
      name: name,
      client: client,
      cid: cid,
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
          cid: cid,
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

  /* ---------------------------------------------------------------- clients */
  Store.prototype.getClients = function () {
    return (this.state.clients || []).slice().sort(function (a, b) {
      return (a.name || "").localeCompare(b.name || "", "ar");
    });
  };

  Store.prototype.getClient = function (id) {
    var list = this.state.clients || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  };

  Store.prototype.addClient = function (params) {
    params = params || {};
    var name = (params.name || "").trim();
    if (!name) return null;

    var newClient = {
      id: U.generateId(),
      name: name,
      phone: (params.phone || "").trim(),
      email: (params.email || "").trim(),
      company: (params.company || "").trim(),
      notes: Array.isArray(params.notes) ? params.notes.slice() : [],
      createdAt: new Date().toISOString()
    };

    if (!this.state.clients || !Array.isArray(this.state.clients)) {
      this.state.clients = [];
    }
    this.state.clients.push(newClient);
    this._notify();
    return newClient;
  };

  Store.prototype.updateClient = function (id, updates) {
    var client = this.getClient(id);
    if (!client) return null;
    updates = updates || {};
    for (var key in updates) {
      if (updates.hasOwnProperty(key)) {
        if (key === "name" || key === "phone" || key === "email" || key === "company") {
          client[key] = (updates[key] || "").trim ? (updates[key] || "").trim() : updates[key];
        } else {
          client[key] = updates[key];
        }
      }
    }
    this._notify();
    return client;
  };

  Store.prototype.deleteClient = function (id) {
    var client = this.getClient(id);
    if (!client) return;
    this.state.clients = (this.state.clients || []).filter(function (c) { return c.id !== id; });
    // unlink references
    var items = this.state.items || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].cid === id) items[i].cid = "";
    }
    var projects = this.state.projects || [];
    for (var p = 0; p < projects.length; p++) {
      if (projects[p].cid === id) projects[p].cid = "";
    }
    this._notify();
  };

  Store.prototype.addClientNote = function (clientId, text) {
    var client = this.getClient(clientId);
    if (!client) return null;
    text = (text || "").trim();
    if (!text) return null;
    if (!Array.isArray(client.notes)) client.notes = [];
    var note = {
      id: U.generateId(),
      text: text,
      date: new Date().toISOString()
    };
    client.notes.unshift(note);
    this._notify();
    return note;
  };

  Store.prototype.deleteClientNote = function (clientId, noteId) {
    var client = this.getClient(clientId);
    if (!client || !Array.isArray(client.notes)) return;
    client.notes = client.notes.filter(function (n) { return n.id !== noteId; });
    this._notify();
  };

  Store.prototype.getItemsForClient = function (client) {
    if (!client) return [];
    var id = client.id;
    var name = (client.name || "").toLowerCase();
    return (this.state.items || []).filter(function (i) {
      if (i.cid && i.cid === id) return true;
      if ((!i.cid) && name && (i.who || "").toLowerCase() === name) return true;
      return false;
    });
  };

  Store.prototype.getProjectsForClient = function (client) {
    if (!client) return [];
    var id = client.id;
    var name = (client.name || "").toLowerCase();
    return (this.state.projects || []).filter(function (p) {
      if (p.cid && p.cid === id) return true;
      if ((!p.cid) && name && (p.client || "").toLowerCase() === name) return true;
      return false;
    });
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
      cid: (params.cid || params.clientId || "").trim(),
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

  Store.prototype.getCategories = function () {
    if (!this.state.categories || !Array.isArray(this.state.categories) || this.state.categories.length === 0) {
      this.state.categories = JSON.parse(JSON.stringify(T.DEFAULT_CATEGORIES || []));
    }
    return this.state.categories.slice();
  };

  Store.prototype.getCategory = function (id) {
    var cats = this.getCategories();
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].id === id) return cats[i];
    }
    return null;
  };

  Store.prototype.getCategoryMeta = function (id) {
    if (id === "all") {
      return { id: "all", label: "الكل", color: "#1f6355", colorClass: "" };
    }
    var cat = this.getCategory(id);
    if (cat) {
      return {
        id: cat.id,
        label: cat.label,
        color: cat.color || "#1f6355",
        colorClass: cat.colorClass || "tag-custom"
      };
    }
    if (id === "delivery") {
      return { id: "delivery", label: "تسليم وتشطيب", color: "#b45309", colorClass: "tag-delivery" };
    }
    if (T.KINDS && T.KINDS[id]) {
      return {
        id: id,
        label: T.KINDS[id].label,
        color: T.KINDS[id].color || "#1f6355",
        colorClass: T.KINDS[id].colorClass || "tag-task"
      };
    }
    return {
      id: id,
      label: id || "مهمة",
      color: "#1f6355",
      colorClass: "tag-task"
    };
  };

  Store.prototype.addCategory = function (params) {
    params = params || {};
    var label = (params.label || "").trim();
    if (!label) return null;

    var id = (params.id || "").trim();
    if (!id) {
      id = "cat_" + U.generateId();
    }
    if (this.getCategory(id)) {
      id = "cat_" + U.generateId();
    }

    var color = params.color || "#1f6355";
    var newCat = {
      id: id,
      label: label,
      color: color,
      colorClass: "tag-custom",
      isDefault: false
    };

    if (!this.state.categories || !Array.isArray(this.state.categories)) {
      this.state.categories = JSON.parse(JSON.stringify(T.DEFAULT_CATEGORIES || []));
    }

    this.state.categories.push(newCat);
    this._notify();
    return newCat;
  };

  Store.prototype.updateCategory = function (id, updates) {
    var cat = this.getCategory(id);
    if (!cat) return null;

    if (updates.label !== undefined && updates.label.trim()) {
      cat.label = updates.label.trim();
    }
    if (updates.color !== undefined && updates.color) {
      cat.color = updates.color;
    }

    this._notify();
    return cat;
  };

  Store.prototype.deleteCategory = function (id, reassignTo) {
    reassignTo = reassignTo || "task";
    var list = this.state.items || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].kind === id) {
        list[i].kind = reassignTo;
      }
    }

    this.state.categories = (this.state.categories || []).filter(function (c) {
      return c.id !== id;
    });

    this._notify();
  };

  Store.prototype.resetCategories = function () {
    this.state.categories = JSON.parse(JSON.stringify(T.DEFAULT_CATEGORIES || []));
    this._notify();
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
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        projects: parsed.projects,
        items: parsed.items,
        categories: Array.isArray(parsed.categories) ? parsed.categories : JSON.parse(JSON.stringify(T.DEFAULT_CATEGORIES || []))
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
