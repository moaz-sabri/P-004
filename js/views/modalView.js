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

  ModalManager.prototype.openTaskModal = function (itemId, prefillProjectId, prefillKind) {
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

    if (kindSelect) {
      kindSelect.innerHTML = Object.keys(T.KINDS)
        .filter(function (k) { return k !== "all" && k !== "delivery"; })
        .map(function (k) {
          return '<option value="' + k + '">' + T.KINDS[k].label + '</option>';
        }).join("");
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
    var dueInput = document.getElementById("projectDue");
    var autoTasksInput = document.getElementById("projectAutoTasks");

    if (nameInput) nameInput.value = "";
    if (clientInput) clientInput.value = "";
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

    var client = document.getElementById("projectClient") ? document.getElementById("projectClient").value.trim() : "";
    var due = document.getElementById("projectDue") ? document.getElementById("projectDue").value : "";
    var generateTasks = document.getElementById("projectAutoTasks") ? document.getElementById("projectAutoTasks").checked : true;

    S.addProject({ name: name, client: client, due: due, generateTasks: generateTasks });
    if (global.StudioNotifications) global.StudioNotifications.playChime();
    this.showToast('تم إنشاء مشروع "' + name + '" بنجاح', "success");

    var dialog = document.getElementById("projectDialog");
    if (dialog) dialog.close();
    return true;
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

  global.StudioModalView = new ModalManager();
})(window);
