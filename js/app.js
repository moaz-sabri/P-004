/**
 * Main Application Controller (Universal, Multi-Page, 100% Local)
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
      testNotifBtn: document.getElementById("testNotifBtn")
    };
  }

  App.prototype.init = function () {
    this.initTheme();
    this.initPWA();
    if (N) N.startScheduler();

    this.bindEvents();
    if (this.page === "projects") {
      this.bindDragAndDrop();
    }

    var self = this;
    S.subscribe(function () {
      self.render();
      self.updateNotificationBadge();
    });

    this.render();
    this.updateNotificationBadge();
  };

  /* ------------------------------------------------------------------------
     PWA Service Worker & Install Prompt
     ------------------------------------------------------------------------ */
  App.prototype.initPWA = function () {
    // Only register serviceWorker if served over http/https (PWA standard)
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

    var self = this;
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
        if (S.getTheme() === "auto") {
          document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
        }
      });
    }
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
    var nextTheme = "light";

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
    // 1. Render Header Stats & Date
    if (StatsV) {
      StatsV.renderStats(this.dom.statsContainer, this.dom.todayDate);
    }

    // 2. Render Page Specific Content
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
    }

    // 3. Update clear search button
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

    if (this.dom.requestPermBtn) {
      this.dom.requestPermBtn.addEventListener("click", function () {
        N.requestPermission(function (granted) {
          M.openNotificationModal();
          if (granted) {
            M.showToast("تم تفعيل إشعارات سطح المكتب بنجاح!", "success");
            N.sendNotification("مفكرة الاستوديو", {
              body: "الإشعارات جاهزة للتنبيه بمواعيدك وتسليماتك القادمة."
            });
          } else {
            M.showToast("لم يتم منح الإذن بالإشعارات.", "info");
          }
        });
      });
    }

    if (this.dom.testChimeBtn) {
      this.dom.testChimeBtn.addEventListener("click", function () {
        N.playChime();
        M.showToast("🔊 تم تشغيل نغمة الاستوديو الهادئة", "info");
      });
    }

    if (this.dom.testNotifBtn) {
      this.dom.testNotifBtn.addEventListener("click", function () {
        N.testNotification();
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

    // Close dialog buttons
    document.addEventListener("click", function (e) {
      var closeBtn = e.target.closest("[data-dialog-close]");
      if (closeBtn) {
        var dialog = closeBtn.closest("dialog");
        if (dialog) dialog.close();
      }

      // Open Category Manager triggers
      var catOpenTrigger = e.target.closest("#openCategoryManagerBtn, #settingsOpenCategoryManagerBtn, #taskModalAddCategoryBtn, [data-action='open-category-manager']");
      if (catOpenTrigger) {
        M.openCategoryManagerModal();
        return;
      }

      // Category color swatch selection
      var swatchBtn = e.target.closest(".color-swatch-btn");
      if (swatchBtn && swatchBtn.closest("#catColorSwatches")) {
        var color = swatchBtn.getAttribute("data-color");
        if (color) {
          M.selectCategoryColor(color);
        }
        return;
      }

      // Submit category form
      if (e.target.closest("#catSubmitBtn")) {
        M.saveCategoryFromForm();
        return;
      }

      // Cancel category edit
      if (e.target.closest("#catCancelEditBtn")) {
        M.cancelEditCategory();
        return;
      }

      // Edit category row
      var editCatBtn = e.target.closest('[data-cat-action="edit"]');
      if (editCatBtn) {
        var catId = editCatBtn.getAttribute("data-id");
        M.editCategory(catId);
        return;
      }

      // Delete category row
      var deleteCatBtn = e.target.closest('[data-cat-action="delete"]');
      if (deleteCatBtn) {
        var delCatId = deleteCatBtn.getAttribute("data-id");
        M.deleteCategoryWithConfirm(delCatId);
        return;
      }

      // Restore default categories
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

  // Launch when DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    var app = new App();
    app.init();
    global.StudioApp = app;
  });

})(window);
