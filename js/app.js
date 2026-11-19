/**
 * Main Application Controller (Universal, Multi-Page, 100% Local, Offline-First & MySQL Sync)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;
  var S = global.StudioStore;
  var N = global.StudioNotifications;
  var M = global.StudioModalView;
  var StatsV = global.StudioStatsView;
  var AgendaV = global.StudioAgendaView;
  var KanbanV = global.StudioKanbanView;
  var ClientsV = global.StudioClientsView;
  var CW = global.StudioCalendarWeek;
  var Sync = global.StudioSync;
  var Auth = global.StudioAuth;
  var AuthGate = global.StudioAuthGate;

  function App() {
    this.page = document.body.dataset.page || "agenda";
    this.activeFilter = "all";
    this.searchQuery = "";
    this.draggedProjectId = null;
    this.deferredInstallPrompt = null;

    this.dom = {
      todayDate: document.getElementById("todayDate"),
      statsContainer: document.getElementById("statsContainer"),
      viewContainer: document.getElementById("viewContainer"),
      searchInput: document.getElementById("searchInput"),
      searchClear: document.getElementById("searchClear"),
      themeToggleBtn: document.getElementById("themeToggleBtn"),
      notifBtn: document.getElementById("notifBtn"),
      notifBadge: document.getElementById("notifBadge"),
      installAppBtn: document.getElementById("installAppBtn"),
      backupBtn: document.getElementById("backupBtn"),
      speedDialContainer: document.getElementById("speedDialContainer"),
      speedDialTrigger: document.getElementById("speedDialTrigger"),
      speedDialBackdrop: document.getElementById("speedDialBackdrop"),
      taskForm: document.getElementById("taskForm"),
      projectForm: document.getElementById("projectForm"),
      confirmActionBtn: document.getElementById("confirmActionBtn"),
      exportDataBtn: document.getElementById("exportDataBtn"),
      importDataInput: document.getElementById("importDataInput"),
      requestPermBtn: document.getElementById("requestPermBtn"),
      testChimeBtn: document.getElementById("testChimeBtn"),
      testNotifBtn: document.getElementById("testNotifBtn"),
      // New Sync & Auth Elements
      syncStatusBtn: document.getElementById("syncStatusBtn"),
      syncStatusBullet: document.getElementById("syncStatusBullet"),
      syncStatusText: document.getElementById("syncStatusText"),
      conflictAlertBtn: document.getElementById("conflictAlertBtn"),
      conflictAlertCount: document.getElementById("conflictAlertCount"),
      userProfileBtn: document.getElementById("userProfileBtn"),
      userProfileName: document.getElementById("userProfileName"),
      // Settings specific elements
      settingsWeekStartSelect: document.getElementById("settingsWeekStartSelect"),
      openChangeLogBtn: document.getElementById("openChangeLogBtn"),
      settingsSyncNowBtn: document.getElementById("settingsSyncNowBtn"),
      settingsAuthManageBtn: document.getElementById("settingsAuthManageBtn")
    };
  }

  App.prototype.init = function () {
    global.StudioAppInstance = this;
    if (global.StudioRouter) global.StudioRouter.init();
    this.initTheme();
    this.initPWA();
    if (N) N.startScheduler();

    var self = this;

    // Initialize Auth Gate (Blocks web access if unauthenticated)
    if (AuthGate) {
      AuthGate.init();
    }

    this.bindEvents();
    if (this.page === "projects") {
      this.bindDragAndDrop();
    }

    // Subscribe to Store updates
    S.subscribe(function () {
      self.render();
      self.updateNotificationBadge();
    });

    // Subscribe to Auth updates
    if (Auth) {
      Auth.subscribe(function (user) {
        self.updateAuthUI(user);
        if (AuthGate) {
          AuthGate.checkGate();
        }
      });
      Auth.verifySession();
    }

    // Subscribe to Sync updates
    if (Sync) {
      Sync.subscribe(function (state) {
        self.updateSyncUI(state);
        if (AuthGate) {
          AuthGate.checkGate();
        }
      });
      this.updateSyncUI({
        isOnline: Sync.isOnline,
        isSyncing: Sync.isSyncing,
        conflictsCount: Sync.conflicts.length,
        pendingCount: Sync.queue.length
      });
    }

    this.render();
    this.updateNotificationBadge();
  };

  /* ------------------------------------------------------------------------
     PWA Service Worker & Install Prompt
     ------------------------------------------------------------------------ */
  App.prototype.initPWA = function () {
    if (window.location.protocol.indexOf("http") === 0 && "serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").then(function (reg) {
          console.log("Service Worker registered locally with scope:", reg.scope);
        }).catch(function (err) {
          console.warn("Service Worker registration skipped:", err);
        });
      });
    }

    var self = this;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      self.deferredInstallPrompt = e;
      if (self.dom.installAppBtn) {
        self.dom.installAppBtn.classList.add("is-visible");
      }
    });

    window.addEventListener("appinstalled", function () {
      self.deferredInstallPrompt = null;
      if (self.dom.installAppBtn) {
        self.dom.installAppBtn.classList.remove("is-visible");
      }
      M.showToast("تم تثبيت التطبيق بنجاح كبرنامج محلي!", "success");
    });
  };

  /* ------------------------------------------------------------------------
     Sync & Auth UI Status
     ------------------------------------------------------------------------ */
  App.prototype.updateSyncUI = function (state) {
    if (!state) return;
    var isOnline = state.isOnline;
    var isSyncing = state.isSyncing;
    var conflictsCount = state.conflictsCount || 0;
    var pendingCount = state.pendingCount || 0;
    var isLoggedIn = state.isLoggedIn;

    // 1. Sync button pill
    if (this.dom.syncStatusBtn) {
      this.dom.syncStatusBtn.classList.remove("is-online", "is-offline", "is-syncing");
      if (isSyncing) {
        this.dom.syncStatusBtn.classList.add("is-syncing");
        if (this.dom.syncStatusText) this.dom.syncStatusText.textContent = "جاري المزامنة...";
      } else if (isOnline) {
        if (!isLoggedIn) {
          this.dom.syncStatusBtn.classList.add("is-offline");
          if (this.dom.syncStatusText) this.dom.syncStatusText.textContent = "أونلاين (يلزم تسجيل الدخول)";
        } else {
          this.dom.syncStatusBtn.classList.add("is-online");
          var text = "متصل";
          if (pendingCount > 0) text += " (" + pendingCount + ")";
          if (this.dom.syncStatusText) this.dom.syncStatusText.textContent = text;
        }
      } else {
        this.dom.syncStatusBtn.classList.add("is-offline");
        var offlineText = "وضع محلي (أوفلاين)";
        if (pendingCount > 0) offlineText += " (" + pendingCount + " معلق)";
        if (this.dom.syncStatusText) this.dom.syncStatusText.textContent = offlineText;
      }
    }

    // 2. Conflict Alert Badge
    if (this.dom.conflictAlertBtn) {
      if (conflictsCount > 0) {
        this.dom.conflictAlertBtn.style.display = "inline-flex";
        if (this.dom.conflictAlertCount) {
          this.dom.conflictAlertCount.textContent = conflictsCount;
        }
      } else {
        this.dom.conflictAlertBtn.style.display = "none";
      }
    }

    // 3. Settings status elements if on settings page
    var settingSyncStatusEl = document.getElementById("settingSyncStatus");
    if (settingSyncStatusEl) {
      if (isOnline) {
        settingSyncStatusEl.innerHTML = isLoggedIn
          ? '<span class="status-badge is-online">🟢 متصل بقاعدة بيانات MySQL (تم تسجيل الدخول)</span>'
          : '<span class="status-badge is-offline" style="color:var(--color-brass);">🟠 متصل بالنت لكن يلزم تسجيل الدخول للمزامنة</span>';
      } else {
        settingSyncStatusEl.innerHTML = '<span class="status-badge is-offline">💻 وضع العمل المحلي (أوفلاين 100%)</span>';
      }
    }
    var settingPendingCountEl = document.getElementById("settingPendingCount");
    if (settingPendingCountEl) {
      settingPendingCountEl.textContent = pendingCount;
    }
  };

  App.prototype.updateAuthUI = function (user) {
    if (this.dom.userProfileName) {
      if (user && (user.name || user.username)) {
        this.dom.userProfileName.textContent = user.name || user.username;
      } else {
        this.dom.userProfileName.textContent = "تسجيل الدخول";
      }
    }

    var settingUserNameEl = document.getElementById("settingUserName");
    if (settingUserNameEl) {
      if (user) {
        settingUserNameEl.textContent = (user.name || user.username) + " (" + (user.role === "admin" ? "مدير" : "مستخدم") + ")";
      } else {
        settingUserNameEl.textContent = "غير مسجل دخول (حساب محلي)";
      }
    }

    if (this.page === "settings") {
      this.renderAdminUsersPanel(user);
    }
  };

  App.prototype.renderAdminUsersPanel = function (user) {
    var existing = document.getElementById("adminUsersPanel");
    if (user && user.role === "admin") {
      if (!existing) {
        var grid = document.querySelector(".settings-grid");
        if (!grid) return;
        existing = document.createElement("section");
        existing.id = "adminUsersPanel";
        existing.className = "setting-card";
        existing.innerHTML = '<h3 class="setting-card-title">👥 إدارة المستخدمين والصلاحيات</h3>' +
          '<p class="setting-card-desc">هذه اللوحة متاحة للمدير فقط. يمكنك تغيير دور المستخدم مع الحفاظ على عزل بيانات كل حساب.</p>' +
          '<div id="adminUsersStatus" class="setting-status-box">جاري تحميل المستخدمين...</div>';
        grid.appendChild(existing);
      }
      this.loadAdminUsers();
    } else if (existing) {
      existing.remove();
    }
  };

  App.prototype.loadAdminUsers = function () {
    var status = document.getElementById("adminUsersStatus");
    if (!status || !Auth || !Auth.getToken()) return;
    var self = this;
    var fetcher = U && U.safeFetchJson
      ? U.safeFetchJson("/api/auth/list_users", { headers: { "Authorization": "Bearer " + Auth.getToken() } })
      : fetch("/api/auth/list_users", { headers: { "Authorization": "Bearer " + Auth.getToken() } }).then(function (r) { return r.json(); });
    fetcher.then(function (data) {
      if (!data || !data.success) throw new Error((data && data.error) || "تعذر تحميل المستخدمين");
      var roles = [
        ["admin", "مدير"], ["manager", "مدير مشاريع"], ["editor", "محرر"],
        ["viewer", "مشاهد"], ["user", "مستخدم"]
      ];
      status.innerHTML = data.users.map(function (item) {
        var options = roles.map(function (role) {
          return '<option value="' + role[0] + '"' + (item.role === role[0] ? " selected" : "") + '>' + role[1] + '</option>';
        }).join("");
        return '<div class="admin-user-row" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);">' +
          '<span><strong>' + U.escapeHtml(item.name || item.username) + '</strong><small style="display:block;color:var(--ink-muted);">' + U.escapeHtml(item.username) + '</small></span>' +
          '<select class="form-control admin-role-select" data-user-id="' + item.id + '" style="max-width:170px;">' + options + '</select></div>';
      }).join("") || '<span style="color:var(--ink-muted);">لا يوجد مستخدمون.</span>';
      status.querySelectorAll(".admin-role-select").forEach(function (select) {
        select.addEventListener("change", function () {
          self.updateUserRole(select);
        });
      });
    }).catch(function (error) {
      status.textContent = error.message || "تعذر تحميل المستخدمين";
    });
  };

  App.prototype.updateUserRole = function (select) {
    var self = this;
    var previous = select.getAttribute("data-previous") || select.value;
    select.disabled = true;
    var options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + Auth.getToken(),
        "X-CSRF-Token": Auth.getCsrfToken ? Auth.getCsrfToken() : ""
      },
      credentials: "include",
      body: JSON.stringify({ user_id: Number(select.getAttribute("data-user-id")), role: select.value })
    };
    var fetcher = U && U.safeFetchJson ? U.safeFetchJson("/api/auth/update_role", options) : fetch("/api/auth/update_role", options).then(function (r) { return r.json(); });
    fetcher.then(function (data) {
      if (!data || !data.success) throw new Error((data && data.error) || "تعذر تحديث الدور");
      select.setAttribute("data-previous", select.value);
      if (M && M.showToast) M.showToast("تم تحديث صلاحية المستخدم بنجاح", "success");
    }).catch(function (error) {
      select.value = previous;
      if (M && M.showToast) M.showToast(error.message || "تعذر تحديث الدور", "error");
    }).finally(function () {
      select.disabled = false;
      self.loadAdminUsers();
    });
  };

  /* ------------------------------------------------------------------------
     Notifications Badge
     ------------------------------------------------------------------------ */
  App.prototype.updateNotificationBadge = function () {
    if (!this.dom.notifBadge) return;
    var today = U.getTodayIso();
    var urgentItems = S.getItems().filter(function (i) { return !i.done && (i.date <= today); });
    var count = urgentItems.length;

    if (count > 0) {
      this.dom.notifBadge.textContent = count > 99 ? "99+" : count;
      this.dom.notifBadge.style.display = "flex";
    } else {
      this.dom.notifBadge.style.display = "none";
    }
  };

  /* ------------------------------------------------------------------------
     Theme Management
     ------------------------------------------------------------------------ */
  App.prototype.initTheme = function () {
    var savedTheme = S.getTheme();
    this.applyTheme(savedTheme);
  };

  App.prototype.applyTheme = function (theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  App.prototype.toggleTheme = function () {
    var current = S.getTheme();
    var nextTheme = "dark";
    if (current === "light") {
      nextTheme = "dark";
    } else if (current === "dark") {
      nextTheme = "light";
    } else {
      var isSystemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      nextTheme = isSystemDark ? "light" : "dark";
    }

    S.setTheme(nextTheme);
    this.applyTheme(nextTheme);
    M.showToast(nextTheme === "dark" ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع النهاري", "info");
  };

  /* ------------------------------------------------------------------------
     Rendering Current Page
     ------------------------------------------------------------------------ */
  App.prototype.render = function () {
    if (AuthGate && AuthGate.shouldLock()) {
      AuthGate.checkGate();
      return;
    }

    if (StatsV) {
      StatsV.renderStats(this.dom.statsContainer, this.dom.todayDate);
    }

    if (this.page === "agenda" && AgendaV && this.dom.viewContainer) {
      this.dom.viewContainer.innerHTML = AgendaV.renderAgendaView({
        activeFilter: this.activeFilter,
        searchQuery: this.searchQuery
      });
    } else if (this.page === "projects" && KanbanV && this.dom.viewContainer) {
      this.dom.viewContainer.innerHTML = KanbanV.renderKanbanView({
        searchQuery: this.searchQuery
      });

      var board = document.getElementById("kanbanBoard");
      if (board && window.innerWidth <= 768) {
        board.addEventListener("scroll", U.debounce(function () {
          var cols = board.querySelectorAll("[data-phase-col]");
          var boardRect = board.getBoundingClientRect();
          var boardCenter = boardRect.left + boardRect.width / 2;
          var closestPhase = null;
          var minDistance = Infinity;

          cols.forEach(function (col) {
            var colRect = col.getBoundingClientRect();
            var colCenter = colRect.left + colRect.width / 2;
            var dist = Math.abs(boardCenter - colCenter);
            if (dist < minDistance) {
              minDistance = dist;
              closestPhase = col.dataset.phaseCol;
            }
          });

          if (closestPhase !== null) {
            var tabs = document.querySelectorAll("[data-phase-tab]");
            tabs.forEach(function (t) {
              t.classList.toggle("is-active", t.dataset.phaseTab === closestPhase);
            });
          }
        }, 60), { passive: true });
      }
    } else if (this.page === "clients" && ClientsV && this.dom.viewContainer) {
      this.dom.viewContainer.innerHTML = ClientsV.renderClientsView({
        searchQuery: this.searchQuery
      });
    }

    if (this.dom.searchClear) {
      if (this.searchQuery) {
        this.dom.searchClear.classList.add("visible");
      } else {
        this.dom.searchClear.classList.remove("visible");
      }
    }
  };

  /* ------------------------------------------------------------------------
     Event Bindings
     ------------------------------------------------------------------------ */
  App.prototype.bindEvents = function () {
    var self = this;

    // Search bar
    if (this.dom.searchInput) {
      var handleSearch = U.debounce(function (val) {
        self.searchQuery = val.trim();
        self.render();
      }, 200);

      this.dom.searchInput.addEventListener("input", function (e) {
        handleSearch(e.target.value);
      });
    }

    if (this.dom.searchClear) {
      this.dom.searchClear.addEventListener("click", function () {
        self.dom.searchInput.value = "";
        self.searchQuery = "";
        self.render();
        self.dom.searchInput.focus();
      });
    }

    // Theme toggle
    if (this.dom.themeToggleBtn) {
      this.dom.themeToggleBtn.addEventListener("click", function () {
        self.toggleTheme();
      });
    }

    // Notification Center
    if (this.dom.notifBtn) {
      this.dom.notifBtn.addEventListener("click", function () {
        M.openNotificationModal();
      });
    }

    // Auth Profile & Modal trigger
    if (this.dom.userProfileBtn) {
      this.dom.userProfileBtn.addEventListener("click", function () {
        if (global.StudioAuthModal) {
          global.StudioAuthModal.openAuthModal();
        }
      });
    }

    // Sync button manual trigger
    if (this.dom.syncStatusBtn) {
      this.dom.syncStatusBtn.addEventListener("click", function () {
        if (!Auth || !Auth.isLoggedIn()) {
          if (Sync && Sync.isOnline) {
            M.showToast("للمزامنة والعمل أونلاين، يجب تسجيل الدخول أو إنشاء حسابك.", "info");
            if (global.StudioAuthModal) {
              global.StudioAuthModal.openAuthModal(true);
            }
          } else {
            M.showToast("أنت تعمل حالياً في وضع العمل المحلي بدون إنترنت 100%.", "info");
          }
          return;
        }

        if (Sync) {
          M.showToast("جاري التحقق من المزامنة مع قاعدة البيانات...", "info");
          Sync.sync().then(function (res) {
            if (res && res.auth_required) {
              if (global.StudioAuthModal) global.StudioAuthModal.openAuthModal(true);
            } else {
              M.showToast("تم تحديث المزامنة بنجاح", "success");
            }
          });
        }
      });
    }

    // Agenda online auth prompt button
    document.addEventListener("click", function (e) {
      if (e.target.closest("#agendaAuthPromptBtn")) {
        if (global.StudioAuthModal) {
          global.StudioAuthModal.openAuthModal(true);
        }
      }
    });

    // Conflict Review Modal Trigger
    if (this.dom.conflictAlertBtn) {
      this.dom.conflictAlertBtn.addEventListener("click", function () {
        if (global.StudioConflictModal) {
          global.StudioConflictModal.openConflictModal();
        }
      });
    }

    // PWA Install Button
    if (this.dom.installAppBtn) {
      this.dom.installAppBtn.addEventListener("click", function () {
        if (!self.deferredInstallPrompt) {
          M.showToast("تطبيق الاستوديو مثبت ويعمل محلياً بالفعل على هذا الجهاز.", "info");
          return;
        }
        self.deferredInstallPrompt.prompt();
        self.deferredInstallPrompt.userChoice.then(function (choice) {
          if (choice.outcome === "accepted") {
            self.dom.installAppBtn.classList.remove("is-visible");
          }
          self.deferredInstallPrompt = null;
        });
      });
    }

    // Speed-Dial Toggle
    if (this.dom.speedDialTrigger) {
      this.dom.speedDialTrigger.addEventListener("click", function () {
        self.dom.speedDialContainer.classList.toggle("is-open");
      });
    }

    if (this.dom.speedDialBackdrop) {
      this.dom.speedDialBackdrop.addEventListener("click", function () {
        self.dom.speedDialContainer.classList.remove("is-open");
      });
    }

    // Speed-Dial Action Items
    if (this.dom.speedDialContainer) {
      this.dom.speedDialContainer.addEventListener("click", function (e) {
        var item = e.target.closest("[data-quick-action]");
        if (!item) return;

        self.dom.speedDialContainer.classList.remove("is-open");
        var action = item.dataset.quickAction;

        switch (action) {
          case "appt":
            M.openTaskModal(null, null, "appt");
            break;
          case "design":
            M.openTaskModal(null, null, "design");
            break;
          case "invoice":
            M.openTaskModal(null, null, "invoice");
            break;
          case "task":
            M.openTaskModal(null, null, "task");
            break;
          case "project":
            M.openProjectModal();
            break;
        }
      });
    }

    // Backup & Restore
    if (this.dom.backupBtn) {
      this.dom.backupBtn.addEventListener("click", function () {
        M.openBackupModal();
      });
    }
    if (this.dom.exportDataBtn) {
      this.dom.exportDataBtn.addEventListener("click", function () {
        M.exportDataToFile();
      });
    }
    if (this.dom.importDataInput) {
      this.dom.importDataInput.addEventListener("change", function (e) {
        if (e.target.files && e.target.files[0]) {
          M.importDataFromFile(e.target.files[0]);
          e.target.value = "";
        }
      });
    }

    // Modal submit forms
    if (this.dom.taskForm) {
      this.dom.taskForm.addEventListener("submit", function (e) {
        e.preventDefault();
        M.saveTask();
      });
    }

    if (this.dom.projectForm) {
      this.dom.projectForm.addEventListener("submit", function (e) {
        e.preventDefault();
        M.saveProject();
      });
    }

    if (this.dom.confirmActionBtn) {
      this.dom.confirmActionBtn.addEventListener("click", function () {
        M.executeConfirm();
      });
    }

    // Global click handlers
    document.addEventListener("click", function (e) {
      var closeBtn = e.target.closest("[data-dialog-close]");
      if (closeBtn) {
        var dialog = closeBtn.closest("dialog");
        if (dialog) dialog.close();
      }

      var catOpenTrigger = e.target.closest("#openCategoryManagerBtn, #settingsOpenCategoryManagerBtn, #taskModalAddCategoryBtn, [data-action='open-category-manager']");
      if (catOpenTrigger) {
        M.openCategoryManagerModal();
        return;
      }

      var swatchBtn = e.target.closest(".color-swatch-btn");
      if (swatchBtn && swatchBtn.closest("#catColorSwatches")) {
        var color = swatchBtn.getAttribute("data-color");
        if (color) {
          M.selectCategoryColor(color);
        }
        return;
      }

      if (e.target.closest("#catSubmitBtn")) {
        M.saveCategoryFromForm();
        return;
      }

      if (e.target.closest("#catCancelEditBtn")) {
        M.cancelEditCategory();
        return;
      }

      var editCatBtn = e.target.closest('[data-cat-action="edit"]');
      if (editCatBtn) {
        var catId = editCatBtn.getAttribute("data-id");
        M.editCategory(catId);
        return;
      }

      var deleteCatBtn = e.target.closest('[data-cat-action="delete"]');
      if (deleteCatBtn) {
        var delCatId = deleteCatBtn.getAttribute("data-id");
        M.deleteCategoryWithConfirm(delCatId);
        return;
      }

      if (e.target.closest("#catRestoreDefaultsBtn")) {
        M.resetCategoriesWithConfirm();
        return;
      }
    });

    // Enter key submit on category name input
    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target && e.target.id === "catNameInput") {
        e.preventDefault();
        M.saveCategoryFromForm();
      }
    });

    // Delegated events for View Container
    if (this.dom.viewContainer) {
      this.dom.viewContainer.addEventListener("submit", function (e) {
        if (e.target.id === "quickAddForm") {
          e.preventDefault();
          var input = document.getElementById("quickAddInput");
          var kindSelect = document.getElementById("quickAddKind");
          var title = input ? input.value.trim() : "";

          if (title) {
            S.addItem({
              title: title,
              kind: kindSelect ? kindSelect.value : "task",
              date: U.getTodayIso()
            });
            if (N) N.playChime();
            M.showToast('تمت إضافة: "' + title + '" إلى قائمة اليوم ⚡', "success");
            input.value = "";
            input.focus();
          }
        }
      });

      this.dom.viewContainer.addEventListener("click", function (e) {
        // Weekly Calendar Actions
        var prevWeekBtn = e.target.closest('[data-action="prev-week"]');
        if (prevWeekBtn && CW) {
          CW.currentWeekOffset--;
          self.render();
          return;
        }

        var nextWeekBtn = e.target.closest('[data-action="next-week"]');
        if (nextWeekBtn && CW) {
          CW.currentWeekOffset++;
          self.render();
          return;
        }

        var currentWeekBtn = e.target.closest('[data-action="current-week"]');
        if (currentWeekBtn && CW) {
          CW.currentWeekOffset = 0;
          self.render();
          return;
        }

        var toggleWeekFilterBtn = e.target.closest('[data-action="toggle-week-filter"]');
        if (toggleWeekFilterBtn && CW) {
          CW.filterByWeek = !CW.filterByWeek;
          self.render();
          return;
        }

        var phaseTab = e.target.closest("[data-phase-tab]");
        if (phaseTab) {
          var targetPhase = phaseTab.dataset.phaseTab;
          var col = document.querySelector('[data-phase-col="' + targetPhase + '"]');
          if (col) {
            col.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
          var allTabs = document.querySelectorAll("[data-phase-tab]");
          for (var i = 0; i < allTabs.length; i++) {
            allTabs[i].classList.toggle("is-active", allTabs[i] === phaseTab);
          }
          return;
        }

        var chip = e.target.closest("[data-filter]");
        if (chip) {
          self.activeFilter = chip.dataset.filter;
          self.render();
          return;
        }

        if (e.target.id === "emptyProjectBtn") {
          M.openProjectModal();
          return;
        }

        var editTrigger = e.target.closest('[data-action="edit-item"]');
        if (editTrigger && !e.target.closest("a") && !e.target.closest('input[type="checkbox"]')) {
          M.openTaskModal(editTrigger.dataset.id);
          return;
        }

        var deleteItemBtn = e.target.closest('[data-action="delete-item"]');
        if (deleteItemBtn) {
          var id = deleteItemBtn.dataset.id;
          var item = S.getItem(id);
          M.openConfirmModal({
            title: "حذف المهمة",
            message: 'هل أنت متأكد من حذف المهمة: "' + (item ? item.title : "") + '"؟',
            onConfirm: function () {
              S.deleteItem(id);
              M.showToast("تم حذف المهمة", "info");
            }
          });
          return;
        }

        var deleteProjBtn = e.target.closest('[data-action="delete-project"]');
        if (deleteProjBtn) {
          var pId = deleteProjBtn.dataset.id;
          var proj = S.getProject(pId);
          M.openConfirmModal({
            title: "حذف المشروع",
            message: 'هل أنت متأكد من حذف المشروع "' + (proj ? proj.name : "") + '" وجميع مهامه؟',
            onConfirm: function () {
              S.deleteProject(pId, true);
              M.showToast("تم حذف المشروع بنجاح", "info");
            }
          });
          return;
        }

        var quickAddBtn = e.target.closest('[data-action="quick-add-task"]');
        if (quickAddBtn) {
          M.openTaskModal(null, quickAddBtn.dataset.projectId);
          return;
        }

        var openClientBtn = e.target.closest('[data-action="open-client"]');
        if (openClientBtn) {
          M.openClientDetail(openClientBtn.dataset.id);
          return;
        }

        var editClientBtn = e.target.closest('[data-action="edit-client"]');
        if (editClientBtn) {
          M.openClientModal(editClientBtn.dataset.id);
          return;
        }

        var deleteClientBtn = e.target.closest('[data-action="delete-client"]');
        if (deleteClientBtn) {
          var cId = deleteClientBtn.dataset.id;
          var cl = S.getClient(cId);
          M.openConfirmModal({
            title: "حذف العميل",
            message: 'هل أنت متأكد من حذف العميل "' + (cl ? cl.name : "") + '"؟ سيُلغى الربط مع المهام (لن تُحذف المهام).',
            onConfirm: function () {
              S.deleteClient(cId);
              M.showToast("تم حذف العميل", "info");
            }
          });
          return;
        }
      });

      this.dom.viewContainer.addEventListener("change", function (e) {
        var toggleDone = e.target.closest('[data-action="toggle-item"]');
        if (toggleDone) {
          S.toggleItemDone(toggleDone.dataset.id);
          if (N) N.playChime();
          return;
        }

        var phaseSelect = e.target.closest('[data-action="change-phase"]');
        if (phaseSelect) {
          var pId = phaseSelect.dataset.id;
          var newPhase = parseInt(phaseSelect.value, 10);
          S.changeProjectPhase(pId, newPhase);
          if (N) N.playChime();
          M.showToast("تم تحديث مرحلة المشروع", "success");
          return;
        }

        var weekStartChange = e.target.closest('[data-action="change-week-start"]');
        if (weekStartChange) {
          S.setWeekStartDay(weekStartChange.value);
          self.render();
          M.showToast("تم تحديث بداية الأسبوع", "info");
          return;
        }
      });
    }

    // Settings page specific bindings
    var setThemeLight = document.getElementById("setThemeLight");
    var setThemeDark = document.getElementById("setThemeDark");
    var setThemeAuto = document.getElementById("setThemeAuto");
    var resetDataBtn = document.getElementById("resetDataBtn");

    if (setThemeLight) {
      setThemeLight.addEventListener("click", function () {
        S.setTheme("light");
        self.applyTheme("light");
        M.showToast("تم تفعيل الوضع النهاري", "info");
      });
    }
    if (setThemeDark) {
      setThemeDark.addEventListener("click", function () {
        S.setTheme("dark");
        self.applyTheme("dark");
        M.showToast("تم تفعيل الوضع الليلي", "info");
      });
    }
    if (setThemeAuto) {
      setThemeAuto.addEventListener("click", function () {
        S.setTheme("auto");
        self.applyTheme("auto");
        M.showToast("تم تفعيل المظهر التلقائي وفق النظام", "info");
      });
    }

    if (this.dom.settingsWeekStartSelect) {
      this.dom.settingsWeekStartSelect.value = S.getWeekStartDay();
      this.dom.settingsWeekStartSelect.addEventListener("change", function (e) {
        S.setWeekStartDay(e.target.value);
        M.showToast("تم حفظ بداية الأسبوع بنجاح", "success");
      });
    }

    if (this.dom.openChangeLogBtn) {
      this.dom.openChangeLogBtn.addEventListener("click", function () {
        if (global.StudioChangeLogModal) {
          global.StudioChangeLogModal.openChangeLogModal();
        }
      });
    }

    if (this.dom.settingsSyncNowBtn) {
      this.dom.settingsSyncNowBtn.addEventListener("click", function () {
        if (Sync) {
          self.dom.settingsSyncNowBtn.disabled = true;
          self.dom.settingsSyncNowBtn.textContent = "جاري المزامنة...";
          Sync.sync().then(function () {
            self.dom.settingsSyncNowBtn.disabled = false;
            self.dom.settingsSyncNowBtn.textContent = "🔄 مزامنة فورية الآن";
            M.showToast("تمت المزامنة مع قاعدة البيانات بنجاح", "success");
          }).catch(function (err) {
            self.dom.settingsSyncNowBtn.disabled = false;
            self.dom.settingsSyncNowBtn.textContent = "🔄 مزامنة فورية الآن";
            M.showToast("تعذرت المزامنة: " + err.message, "error");
          });
        }
      });
    }

    if (this.dom.settingsAuthManageBtn) {
      this.dom.settingsAuthManageBtn.addEventListener("click", function () {
        if (global.StudioAuthModal) {
          global.StudioAuthModal.openAuthModal();
        }
      });
    }

    if (resetDataBtn) {
      resetDataBtn.addEventListener("click", function () {
        M.openConfirmModal({
          title: "إعادة ضبط المصنع",
          message: "هل تريد حقاً استعادة البيانات الافتراضية وحذف أي تعديلات حالية؟",
          confirmText: "نعم، استعد البيانات الافتراضية",
          onConfirm: function () {
            S.resetDefaults();
            M.showToast("تمت استعادة البيانات الافتراضية بنجاح", "success");
          }
        });
      });
    }

    // Global Keyboard Shortcuts
    window.addEventListener("keydown", function (e) {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        if (self.dom.searchInput) {
          e.preventDefault();
          self.dom.searchInput.focus();
        }
      }
      if ((e.key === "n" || e.key === "N") && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        if (self.dom.speedDialContainer) {
          e.preventDefault();
          self.dom.speedDialContainer.classList.toggle("is-open");
        }
      }
    });
  };

  /* ------------------------------------------------------------------------
     Kanban Drag & Drop (HTML5 API)
     ------------------------------------------------------------------------ */
  App.prototype.bindDragAndDrop = function () {
    var self = this;
    if (!this.dom.viewContainer) return;

    this.dom.viewContainer.addEventListener("dragstart", function (e) {
      var card = e.target.closest(".project-card");
      if (!card) return;

      self.draggedProjectId = card.dataset.projectId;
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", self.draggedProjectId);
    });

    this.dom.viewContainer.addEventListener("dragend", function (e) {
      var card = e.target.closest(".project-card");
      if (card) {
        card.classList.remove("is-dragging");
      }
      var cols = document.querySelectorAll(".kanban-col");
      for (var i = 0; i < cols.length; i++) {
        cols[i].classList.remove("drag-over");
      }
      self.draggedProjectId = null;
    });

    this.dom.viewContainer.addEventListener("dragover", function (e) {
      var col = e.target.closest(".kanban-col");
      if (!col) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drag-over");
    });

    this.dom.viewContainer.addEventListener("dragleave", function (e) {
      var col = e.target.closest(".kanban-col");
      if (!col) return;

      if (!col.contains(e.relatedTarget)) {
        col.classList.remove("drag-over");
      }
    });

    this.dom.viewContainer.addEventListener("drop", function (e) {
      var col = e.target.closest(".kanban-col");
      if (!col) return;

      e.preventDefault();
      col.classList.remove("drag-over");

      var targetPhase = parseInt(col.dataset.phaseCol, 10);
      var projectId = e.dataTransfer.getData("text/plain") || self.draggedProjectId;

      if (projectId && !isNaN(targetPhase)) {
        var proj = S.getProject(projectId);
        if (proj && proj.phase !== targetPhase) {
          S.changeProjectPhase(projectId, targetPhase);
          if (N) N.playChime();
          M.showToast('تم نقل "' + proj.name + '" إلى المرحلة الجديدة', "success");
        }
      }
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    var app = new App();
    app.init();
    global.StudioApp = app;
  });

})(window);
