/**
 * Modal & Toast Views (Universal & Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;
  var T = global.StudioTemplates;

  function ModalManager() {
    this.editItemId = null;
    this.confirmCallback = null;
    this.selectedColor = "#1f6355";
    this.editingCategoryId = null;
  }

  ModalManager.prototype.showToast = function (message, type, duration) {
    type = type || "info";
    duration = duration || 3200;

    var container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    var iconSvg = "";
    if (type === "success") {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;color:var(--color-success);"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === "error") {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;color:var(--color-late);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;color:var(--color-info);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    var toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.innerHTML = iconSvg + '<span>' + (U ? U.escapeHtml(message) : message) + '</span>';

    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px) scale(0.95)";
      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }, duration);
  };

  ModalManager.prototype.openTaskModal = function (itemId, prefillProjectId, prefillKind, prefillClientId) {
    var S = global.StudioStore;
    this.editItemId = itemId || null;
    var item = itemId ? S.getItem(itemId) : null;
    var projects = S.getProjects();

    var dialog = document.getElementById("taskDialog");
    if (!dialog) return;

    var titleEl = document.getElementById("taskModalTitle");
    var projSelect = document.getElementById("taskProject");
    var kindSelect = document.getElementById("taskKind");

    if (titleEl) {
      titleEl.textContent = item ? "تعديل المهمة أو الموعد" : "مهمة أو موعد جديد";
    }

    if (projSelect) {
      projSelect.innerHTML = '<option value="">بدون مشروع</option>' +
        projects.map(function (p) {
          return '<option value="' + p.id + '">' + U.escapeHtml(p.name) + '</option>';
        }).join("");
    }

    var clientSelect = document.getElementById("taskClient");
    if (clientSelect && S.getClients) {
      var currentClient = item ? (item.cid || "") : (prefillClientId || "");


      var clients = S.getClients();
      clientSelect.innerHTML = '<option value="">بدون عميل</option>' +
        clients.map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === currentClient ? ' selected' : '') + '>' + U.escapeHtml(c.name) + '</option>';
        }).join("");
      if (currentClient) clientSelect.value = currentClient;
    }
    if (kindSelect) {
      var categories = S.getCategories ? S.getCategories() : [];
      var currentKind = item ? item.kind : (prefillKind || "task");
      var html = categories
        .filter(function (c) { return c.id !== "all"; })
        .map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === currentKind ? ' selected' : '') + '>' + U.escapeHtml(c.label) + '</option>';
        }).join("");

      var hasCurrent = categories.some(function (c) { return c.id === currentKind; });
      if (!hasCurrent && currentKind && currentKind !== "all") {
        var meta = S.getCategoryMeta(currentKind);
        html = '<option value="' + currentKind + '" selected>' + U.escapeHtml(meta.label) + '</option>' + html;
      }
      kindSelect.innerHTML = html;
    }

    var titleInp = document.getElementById("taskTitle");
    var kindInp = document.getElementById("taskKind");
    var dateInp = document.getElementById("taskDate");
    var timeInp = document.getElementById("taskTime");
    var whoInp = document.getElementById("taskWho");
    var phoneInp = document.getElementById("taskPhone");
    var projectInp = document.getElementById("taskProject");

    if (titleInp) titleInp.value = item ? item.title : "";
    if (kindInp) kindInp.value = item ? item.kind : (prefillKind || "task");
    if (dateInp) dateInp.value = item ? item.date : U.getTodayIso();
    if (timeInp) timeInp.value = item ? (item.time || "") : "";
    if (whoInp) whoInp.value = item ? (item.who || "") : "";
    if (phoneInp) phoneInp.value = item ? (item.phone || "") : "";
    if (projectInp) projectInp.value = item ? (item.pid || "") : (prefillProjectId || "");

    if (!item && prefillClientId && global.StudioStore) {
      var pc = global.StudioStore.getClient(prefillClientId);
      if (pc) {
        if (whoInp && !whoInp.value) whoInp.value = pc.name || "";
        if (phoneInp && !phoneInp.value) phoneInp.value = pc.phone || "";
      }
    }

    dialog.showModal();
    if (titleInp) titleInp.focus();
  };

  ModalManager.prototype.saveTask = function () {
    var S = global.StudioStore;
    var titleInput = document.getElementById("taskTitle");
    var title = titleInput ? titleInput.value.trim() : "";

    if (!title) {
      this.showToast("يرجى كتابة عنوان للمهمة أو الموعد", "error");
      if (titleInput) titleInput.focus();
      return false;
    }

    var payload = {
      title: title,
      kind: document.getElementById("taskKind") ? document.getElementById("taskKind").value : "task",
      date: document.getElementById("taskDate") && document.getElementById("taskDate").value ? document.getElementById("taskDate").value : U.getTodayIso(),
      time: document.getElementById("taskTime") ? document.getElementById("taskTime").value : "",
      pid: document.getElementById("taskProject") ? document.getElementById("taskProject").value : "",
      cid: document.getElementById("taskClient") ? document.getElementById("taskClient").value : "",
      who: document.getElementById("taskWho") ? document.getElementById("taskWho").value.trim() : "",
      phone: document.getElementById("taskPhone") ? document.getElementById("taskPhone").value.trim() : ""
    };

    if (this.editItemId) {
      S.updateItem(this.editItemId, payload);
      this.showToast("تم تحديث المهمة بنجاح", "success");
    } else {
      S.addItem(payload);
      if (global.StudioNotifications) global.StudioNotifications.playChime();
      this.showToast("تمت إضافة المهمة بنجاح", "success");
    }

    var dialog = document.getElementById("taskDialog");
    if (dialog) dialog.close();
    return true;
  };

  ModalManager.prototype.openProjectModal = function () {
    var dialog = document.getElementById("projectDialog");
    if (!dialog) return;

    var nameInput = document.getElementById("projectName");
    var clientInput = document.getElementById("projectClient");
    var clientSelect = document.getElementById("projectClientSelect");
    var dueInput = document.getElementById("projectDue");
    var autoTasksInput = document.getElementById("projectAutoTasks");

    if (nameInput) nameInput.value = "";
    if (clientInput) clientInput.value = "";
    if (clientSelect && global.StudioStore && global.StudioStore.getClients) {
      clientSelect.innerHTML = '<option value="">بدون عميل</option>' +
        global.StudioStore.getClients().map(function (c) {
          return '<option value="' + c.id + '">' + U.escapeHtml(c.name) + '</option>';
        }).join("");
      clientSelect.value = "";
    }
    if (dueInput) dueInput.value = "";
    if (autoTasksInput) autoTasksInput.checked = true;

    dialog.showModal();
    if (nameInput) nameInput.focus();
  };

  ModalManager.prototype.saveProject = function () {
    var S = global.StudioStore;
    var nameInput = document.getElementById("projectName");
    var name = nameInput ? nameInput.value.trim() : "";

    if (!name) {
      this.showToast("يرجى إدخال اسم المشروع", "error");
      if (nameInput) nameInput.focus();
      return false;
    }

    var clientText = document.getElementById("projectClient") ? document.getElementById("projectClient").value.trim() : "";
    var clientSelect = document.getElementById("projectClientSelect");
    var cid = clientSelect ? (clientSelect.value || "") : "";
    var client = clientText;
    if (cid) {
      var c = S.getClient(cid);
      if (c) client = c.name;
    } else if (client) {
      // try auto-link by name
      var found = (S.getClients() || []).filter(function (cl) {
        return (cl.name || "").toLowerCase() === client.toLowerCase();
      })[0];
      if (found) cid = found.id;
    }

    var due = document.getElementById("projectDue") ? document.getElementById("projectDue").value : "";
    var generateTasks = document.getElementById("projectAutoTasks") ? document.getElementById("projectAutoTasks").checked : true;

    S.addProject({ name: name, client: client, cid: cid, due: due, generateTasks: generateTasks });
    if (global.StudioNotifications) global.StudioNotifications.playChime();
    this.showToast('تم إنشاء مشروع "' + name + '" بنجاح', "success");

    var dialog = document.getElementById("projectDialog");
    if (dialog) dialog.close();
    return true;
  };

  ModalManager.prototype.openClientModal = function (clientId) {
    var S = global.StudioStore;
    var dialog = document.getElementById("clientDialog");
    if (!dialog) return;
    this.editingClientId = clientId || null;
    var client = clientId ? S.getClient(clientId) : null;

    var titleEl = document.getElementById("clientModalTitle");
    if (titleEl) titleEl.textContent = client ? "تعديل بيانات العميل" : "إضافة عميل جديد";

    var nameInp = document.getElementById("clientName");
    var phoneInp = document.getElementById("clientPhone");
    var emailInp = document.getElementById("clientEmail");
    var companyInp = document.getElementById("clientCompany");

    if (nameInp) nameInp.value = client ? (client.name || "") : "";
    if (phoneInp) phoneInp.value = client ? (client.phone || "") : "";
    if (emailInp) emailInp.value = client ? (client.email || "") : "";
    if (companyInp) companyInp.value = client ? (client.company || "") : "";

    dialog.showModal();
    if (nameInp) nameInp.focus();
  };

  ModalManager.prototype.saveClient = function () {
    var S = global.StudioStore;
    var nameInp = document.getElementById("clientName");
    var name = nameInp ? nameInp.value.trim() : "";
    if (!name) {
      this.showToast("يرجى إدخال اسم العميل", "error");
      if (nameInp) nameInp.focus();
      return false;
    }

    var payload = {
      name: name,
      phone: document.getElementById("clientPhone") ? document.getElementById("clientPhone").value.trim() : "",
      email: document.getElementById("clientEmail") ? document.getElementById("clientEmail").value.trim() : "",
      company: document.getElementById("clientCompany") ? document.getElementById("clientCompany").value.trim() : ""
    };

    if (this.editingClientId) {
      S.updateClient(this.editingClientId, payload);
      this.showToast('تم تحديث بيانات "' + name + '" بنجاح', "success");
    } else {
      S.addClient(payload);
      if (global.StudioNotifications) global.StudioNotifications.playChime();
      this.showToast('تم إضافة العميل "' + name + '" بنجاح', "success");
    }

    var dialog = document.getElementById("clientDialog");
    if (dialog) dialog.close();
    this.editingClientId = null;
    return true;
  };

  ModalManager.prototype.openClientDetail = function (clientId) {
    var S = global.StudioStore;
    var T = global.StudioTemplates;
    var client = S.getClient(clientId);
    if (!client) return;
    var dialog = document.getElementById("clientDetailDialog");
    if (!dialog) return;

    var tasks = S.getItemsForClient(client);
    var projects = S.getProjectsForClient(client);
    var notes = Array.isArray(client.notes) ? client.notes : [];

    var content = document.getElementById("clientDetailContent");
    if (!content) return;

    var html = [];
    html.push('<div class="modal-header">');
    html.push('  <h3>ملف العميل: ' + U.escapeHtml(client.name) + '</h3>');
    html.push('  <button class="btn-icon" data-dialog-close aria-label="إغلاق">✕</button>');
    html.push('</div>');

    html.push('<div style="margin-bottom:14px; color:var(--ink-secondary); font-size:0.9rem;">');
    if (client.phone) html.push('  <div>📞 <span dir="ltr">' + U.escapeHtml(client.phone) + '</span></div>');
    if (client.email) html.push('  <div>✉️ ' + U.escapeHtml(client.email) + '</div>');
    if (client.company) html.push('  <div>🏢 ' + U.escapeHtml(client.company) + '</div>');
    html.push('  <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">');
    html.push('    <button class="btn btn-sm" onclick="StudioModalView.openClientModal(\'' + client.id + '\')">تعديل البيانات</button>');
    html.push('    <button class="btn btn-secondary btn-sm" onclick="StudioModalView.openTaskModal(null,null,null,\'' + client.id + '\')">+ مهمة جديدة</button>');
    html.push('  </div>');
    html.push('</div>');

    // Projects
    html.push('<h4 style="margin:12px 0 6px; color:var(--ink-primary);">المشاريع (' + projects.length + ')</h4>');
    if (projects.length === 0) {
      html.push('<p style="color:var(--ink-muted); font-size:0.86rem;">لا توجد مشاريع مرتبط بهذا العميل.</p>');
    } else {
      html.push('<div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">');
      for (var p = 0; p < projects.length; p++) {
        var pr = projects[p];
        html.push('  <div style="padding:8px 10px; background:var(--bg-app); border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">');
        html.push('    <span style="font-weight:600;">' + U.escapeHtml(pr.name) + '</span>');
        html.push('    <span class="tag tag-task">' + U.escapeHtml((T.PHASES ? (T.PHASES[pr.phase] ? T.PHASES[pr.phase].label : "") : "")) + '</span>');
        html.push('  </div>');
      }
      html.push('</div>');
    }

    // Tasks
    html.push('<h4 style="margin:12px 0 6px; color:var(--ink-primary);">المهام والمواعيد (' + tasks.length + ')</h4>');
    if (tasks.length === 0) {
      html.push('<p style="color:var(--ink-muted); font-size:0.86rem;">لا توجد مهام مرتبطة بهذا العميل.</p>');
    } else {
      html.push('<div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px; max-height:200px; overflow-y:auto;">');
      for (var t = 0; t < tasks.length; t++) {
        var it = tasks[t];
        html.push('  <div style="padding:8px 10px; background:var(--bg-app); border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center; font-size:0.86rem;">');
        html.push('    <span style="' + (it.done ? "text-decoration:line-through; color:var(--ink-muted);" : "") + '">' + U.escapeHtml(it.title) + '</span>');
        html.push('    <span style="color:var(--ink-muted);">' + (it.date || "") + '</span>');
        html.push('  </div>');
      }
      html.push('</div>');
    }

    // Notes
    html.push('<h4 style="margin:12px 0 6px; color:var(--ink-primary);">ملاحظات خاصة (' + notes.length + ')</h4>');
    html.push('<div style="display:flex; gap:8px; margin-bottom:10px;">');
    html.push('  <textarea id="clientNoteInput" class="form-control" placeholder="أضف ملاحظة جديدة..." style="min-height:60px;"></textarea>');
    html.push('  <button class="btn btn-sm" style="align-self:flex-end;" onclick="StudioModalView.saveClientNote(\'' + client.id + '\')">إضافة</button>');
    html.push('</div>');
    if (notes.length === 0) {
      html.push('<p style="color:var(--ink-muted); font-size:0.86rem;">لا توجد ملاحظات بعد.</p>');
    } else {
      html.push('<div style="display:flex; flex-direction:column; gap:6px; max-height:180px; overflow-y:auto;">');
      for (var n = 0; n < notes.length; n++) {
        var note = notes[n];
        var dateStr = note.date ? new Date(note.date).toLocaleDateString("ar-EG") : "";
        html.push('  <div style="padding:10px; background:var(--bg-app); border-radius:var(--radius-sm); border-inline-start:3px solid var(--accent-primary);">');
        html.push('    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">');
        html.push('      <span style="font-size:0.75rem; color:var(--ink-muted);">' + U.escapeHtml(dateStr) + '</span>');
        html.push('      <button class="task-action-btn btn-delete" onclick="StudioModalView.deleteClientNoteConfirm(\'' + client.id + '\',\'' + note.id + '\')" title="حذف">✕</button>');
        html.push('    </div>');
        html.push('    <div style="white-space:pre-wrap; font-size:0.9rem;">' + U.escapeHtml(note.text) + '</div>');
        html.push('  </div>');
      }
      html.push('</div>');
    }

    content.innerHTML = html.join("");
    dialog.showModal();
  };

  ModalManager.prototype.saveClientNote = function (clientId) {
    var S = global.StudioStore;
    var inp = document.getElementById("clientNoteInput");
    var text = inp ? inp.value.trim() : "";
    if (!text) {
      this.showToast("يرجى كتابة ملاحظة", "error");
      return;
    }
    S.addClientNote(clientId, text);
    if (inp) inp.value = "";
    this.showToast("تمت إضافة الملاحظة", "success");
    this.openClientDetail(clientId);
  };

  ModalManager.prototype.deleteClientNoteConfirm = function (clientId, noteId) {
    var self = this;
    var S = global.StudioStore;
    this.openConfirmModal({
      title: "حذف الملاحظة",
      message: "هل أنت متأكد من حذف هذه الملاحظة؟",
      onConfirm: function () {
        S.deleteClientNote(clientId, noteId);
        self.showToast("تم حذف الملاحظة", "info");
        self.openClientDetail(clientId);
      }
    });
  };

  ModalManager.prototype.openConfirmModal = function (params) {
    var dialog = document.getElementById("confirmDialog");
    if (!dialog) {
      if (confirm(params.message || "تأكيد الإجراء؟")) {
        if (params.onConfirm) params.onConfirm();
      }
      return;
    }

    var titleEl = document.getElementById("confirmTitle");
    var msgEl = document.getElementById("confirmMessage");
    var btnEl = document.getElementById("confirmActionBtn");

    if (titleEl) titleEl.textContent = params.title || "تأكيد الإجراء";
    if (msgEl) msgEl.textContent = params.message || "هل أنت متأكد من المتابعة؟";
    if (btnEl) btnEl.textContent = params.confirmText || "نعم، احذف";

    this.confirmCallback = params.onConfirm;
    dialog.showModal();
  };

  ModalManager.prototype.executeConfirm = function () {
    if (typeof this.confirmCallback === "function") {
      this.confirmCallback();
      this.confirmCallback = null;
    }
    var dialog = document.getElementById("confirmDialog");
    if (dialog) dialog.close();
  };

  ModalManager.prototype.openNotificationModal = function () {
    var dialog = document.getElementById("notificationDialog");
    if (!dialog) return;

    var statusText = document.getElementById("notifStatusText");
    var permBtn = document.getElementById("requestPermBtn");
    var listContainer = document.getElementById("notifTasksList");
    var N = global.StudioNotifications;
    var S = global.StudioStore;

    if (N) {
      var permission = N.getPermission();
      if (permission === "granted") {
        if (statusText) statusText.innerHTML = '<span style="color:var(--color-success); font-weight:600;">✓ إشعارات سطح المكتب مفعّلة بنجاح</span>';
        if (permBtn) permBtn.style.display = "none";
      } else if (permission === "denied") {
        if (statusText) statusText.innerHTML = '<span style="color:var(--color-late); font-weight:600;">✕ الإشعارات محظورة من إعدادات المتصفح</span>';
        if (permBtn) permBtn.style.display = "none";
      } else {
        if (statusText) statusText.innerHTML = '<span style="color:var(--ink-secondary);">الإشعارات بانتظار إذن التفعيل</span>';
        if (permBtn) permBtn.style.display = "inline-flex";
      }
    }

    if (listContainer && S) {
      var today = U.getTodayIso();
      var urgentItems = S.getItems().filter(function (i) { return !i.done && (i.date <= today); });

      if (urgentItems.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--ink-muted); font-size:0.88rem; text-align:center; padding:12px;">لا توجد تنبيهات عاجلة اليوم. رائع!</p>';
      } else {
        listContainer.innerHTML = urgentItems.map(function (item) {
          var isLate = item.date < today;
          var timeStr = item.time ? "الساعة " + item.time : (isLate ? "متأخر" : "اليوم");
          return [
            '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-radius:var(--radius-sm); background:var(--bg-app); margin-bottom:6px; font-size:0.86rem;">',
            '  <div>',
            '    <b style="color:var(--ink-primary);">' + U.escapeHtml(item.title) + '</b>',
            '    <div style="color:var(--ink-muted); font-size:0.78rem;">' + (item.who ? U.escapeHtml(item.who) + " · " : "") + timeStr + '</div>',
            '  </div>',
            '  <span class="tag ' + (isLate ? "tag-late" : "tag-appt") + '">' + (isLate ? "متأخر" : "اليوم") + '</span>',
            '</div>'
          ].join("");
        }).join("");
      }
    }

    dialog.showModal();
  };

  ModalManager.prototype.openBackupModal = function () {
    var dialog = document.getElementById("backupDialog");
    if (dialog) dialog.showModal();
  };

  ModalManager.prototype.exportDataToFile = function () {
    var S = global.StudioStore;
    var data = S.exportData();
    var today = U.getTodayIso();
    U.downloadJsonFile("studio-planner-backup-" + today + ".json", data);
    this.showToast("تم تنزيل نسخة احتياطية من البيانات", "success");
  };

  ModalManager.prototype.importDataFromFile = function (file) {
    if (!file) return;
    var self = this;
    var reader = new FileReader();
    reader.onload = function (e) {
      var result = global.StudioStore.importData(e.target.result);
      if (result.success) {
        self.showToast("تم استيراد البيانات بنجاح", "success");
        var dialog = document.getElementById("backupDialog");
        if (dialog) dialog.close();
      } else {
        self.showToast("فشل الاستيراد: " + result.error, "error");
      }
    };
    reader.readAsText(file);
  };

  ModalManager.prototype.openCategoryManagerModal = function (editCatId) {
    var dialog = document.getElementById("categoryManagerDialog");
    if (!dialog) return;

    this.renderCategorySwatches();
    this.renderCategoryList();

    if (editCatId) {
      this.editCategory(editCatId);
    } else {
      this.cancelEditCategory();
    }

    dialog.showModal();
  };

  ModalManager.prototype.renderCategorySwatches = function () {
    var swatchesContainer = document.getElementById("catColorSwatches");
    if (!swatchesContainer) return;

    var colors = (T.CATEGORY_COLORS && T.CATEGORY_COLORS.length > 0)
      ? T.CATEGORY_COLORS
      : [
        { name: "أخضر استوديو", hex: "#1f6355" },
        { name: "أزرق ملكي", hex: "#2563eb" },
        { name: "سماوي حديث", hex: "#0284c7" },
        { name: "زمردي طبيعي", hex: "#16a34a" },
        { name: "كهرماني دافئ", hex: "#d97706" },
        { name: "نحاسي فاخر", hex: "#966a24" },
        { name: "بنفسجي إبداعي", hex: "#7c3aed" },
        { name: "وردي توتي", hex: "#e11d48" },
        { name: "مرجاني حيوي", hex: "#ea580c" },
        { name: "رمادي داكن", hex: "#475569" }
      ];

    var self = this;
    swatchesContainer.innerHTML = colors.map(function (c) {
      var isSelected = self.selectedColor.toLowerCase() === c.hex.toLowerCase();
      return '<button type="button" class="color-swatch-btn ' + (isSelected ? "is-selected" : "") + '" data-color="' + c.hex + '" style="background-color:' + c.hex + ';" title="' + c.name + '"></button>';
    }).join("");
  };

  ModalManager.prototype.selectCategoryColor = function (hex) {
    if (!hex) return;
    this.selectedColor = hex;
    var swatches = document.querySelectorAll("#catColorSwatches .color-swatch-btn");
    for (var i = 0; i < swatches.length; i++) {
      var btnHex = swatches[i].getAttribute("data-color");
      if (btnHex && btnHex.toLowerCase() === hex.toLowerCase()) {
        swatches[i].classList.add("is-selected");
      } else {
        swatches[i].classList.remove("is-selected");
      }
    }
    var customPicker = document.getElementById("catCustomColor");
    if (customPicker) {
      customPicker.value = hex;
    }
  };

  ModalManager.prototype.renderCategoryList = function () {
    var listContainer = document.getElementById("catItemsList");
    if (!listContainer) return;

    var S = global.StudioStore;
    var categories = S.getCategories ? S.getCategories() : [];
    var allItems = S.getItems();

    if (categories.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; padding:16px; color:var(--ink-muted); font-size:0.88rem;">لا توجد تصنيفات حالياً. يمكنك إضافة تصنيف جديد أعلاه.</div>';
      return;
    }

    listContainer.innerHTML = categories.map(function (cat) {
      var count = allItems.filter(function (i) { return i.kind === cat.id; }).length;
      var bg = U.hexToRgba(cat.color || "#1f6355", 0.12);
      var border = U.hexToRgba(cat.color || "#1f6355", 0.28);
      var isTaskDefault = cat.id === "task";

      return [
        '<div class="cat-item-card" data-cat-id="' + cat.id + '">',
        '  <div class="cat-item-info">',
        '    <span class="cat-item-badge" style="background-color:' + bg + '; color:' + (cat.color || "#1f6355") + '; border: 1px solid ' + border + ';">',
        '      <span style="width:8px; height:8px; border-radius:50%; background-color:' + (cat.color || "#1f6355") + ';"></span>',
        '      <span>' + U.escapeHtml(cat.label) + '</span>',
        '    </span>',
        '    <span class="cat-task-count">' + (count > 0 ? (count + " مهام") : "لا توجد مهام") + '</span>',
        '  </div>',
        '  <div class="cat-item-actions">',
        '    <button type="button" class="task-action-btn" data-cat-action="edit" data-id="' + cat.id + '" title="تعديل التصنيف">',
        '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
        '    </button>',
        isTaskDefault ? '' : [
          '    <button type="button" class="task-action-btn btn-delete" data-cat-action="delete" data-id="' + cat.id + '" title="حذف التصنيف">',
          '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
          '    </button>'
        ].join(""),
        '  </div>',
        '</div>'
      ].join("");
    }).join("");
  };

  ModalManager.prototype.editCategory = function (catId) {
    var S = global.StudioStore;
    var cat = S.getCategory(catId);
    if (!cat) return;

    this.editingCategoryId = catId;
    var nameInp = document.getElementById("catNameInput");
    if (nameInp) {
      nameInp.value = cat.label;
      nameInp.focus();
    }

    this.selectCategoryColor(cat.color || "#1f6355");

    var submitBtn = document.getElementById("catSubmitBtn");
    if (submitBtn) {
      submitBtn.innerHTML = '<span>حفظ التعديل</span>';
    }

    var cancelBtn = document.getElementById("catCancelEditBtn");
    if (cancelBtn) {
      cancelBtn.style.display = "inline-flex";
    }

    var formTitle = document.getElementById("catFormTitle");
    if (formTitle) {
      formTitle.textContent = "تعديل التصنيف: " + cat.label;
    }
  };

  ModalManager.prototype.cancelEditCategory = function () {
    this.editingCategoryId = null;
    var nameInp = document.getElementById("catNameInput");
    if (nameInp) nameInp.value = "";

    this.selectCategoryColor("#1f6355");

    var submitBtn = document.getElementById("catSubmitBtn");
    if (submitBtn) {
      submitBtn.innerHTML = '<span>إضافة التصنيف</span>';
    }

    var cancelBtn = document.getElementById("catCancelEditBtn");
    if (cancelBtn) {
      cancelBtn.style.display = "none";
    }

    var formTitle = document.getElementById("catFormTitle");
    if (formTitle) {
      formTitle.textContent = "إضافة قسم أو تصنيف جديد";
    }
  };

  ModalManager.prototype.saveCategoryFromForm = function () {
    var nameInp = document.getElementById("catNameInput");
    var label = nameInp ? nameInp.value.trim() : "";
    if (!label) {
      this.showToast("يرجى كتابة اسم التصنيف", "error");
      if (nameInp) nameInp.focus();
      return;
    }

    var S = global.StudioStore;
    var color = this.selectedColor || "#1f6355";

    if (this.editingCategoryId) {
      S.updateCategory(this.editingCategoryId, { label: label, color: color });
      this.showToast('تم تحديث تصنيف "' + label + '" بنجاح', "success");
    } else {
      S.addCategory({ label: label, color: color });
      this.showToast('تمت إضافة تصنيف "' + label + '" بنجاح', "success");
    }

    this.cancelEditCategory();
    this.renderCategoryList();
    if (global.StudioApp && typeof global.StudioApp.render === "function") {
      global.StudioApp.render();
    }
  };

  ModalManager.prototype.deleteCategoryWithConfirm = function (catId) {
    var S = global.StudioStore;
    var cat = S.getCategory(catId);
    if (!cat) return;

    if (catId === "task") {
      this.showToast("لا يمكن حذف التصنيف الأساسي (مهمة عامة)", "error");
      return;
    }

    var self = this;
    var count = S.getItems().filter(function (i) { return i.kind === catId; }).length;

    var message = count > 0
      ? 'هذا التصنيف يحتوي على (' + count + ') مهمة. سيتم تحويل هذه المهام تلقائياً إلى "مهمة عامة" وحذف التصنيف نهائياً. هل أنت متأكد؟'
      : 'هل أنت متأكد من حذف تصنيف "' + cat.label + '"؟';

    this.openConfirmModal({
      title: "تأكيد حذف التصنيف",
      message: message,
      confirmText: "حذف التصنيف",
      onConfirm: function () {
        S.deleteCategory(catId, "task");
        self.renderCategoryList();
        self.showToast('تم حذف تصنيف "' + cat.label + '"', "info");
        if (global.StudioApp && typeof global.StudioApp.render === "function") {
          global.StudioApp.render();
        }
      }
    });
  };

  ModalManager.prototype.resetCategoriesWithConfirm = function () {
    var self = this;
    this.openConfirmModal({
      title: "استعادة التصنيفات الافتراضية",
      message: "هل تريد استعادة قائمة التصنيفات الافتراضية المدمجة في النظام؟ لن يتم حذف أي من مهامك الحالية.",
      confirmText: "استعادة الافتراضيات",
      onConfirm: function () {
        global.StudioStore.resetCategories();
        self.cancelEditCategory();
        self.renderCategoryList();
        self.showToast("تمت استعادة التصنيفات الافتراضية", "success");
        if (global.StudioApp && typeof global.StudioApp.render === "function") {
          global.StudioApp.render();
        }
      }
    });
  };

  global.StudioModalView = new ModalManager();
})(window);
