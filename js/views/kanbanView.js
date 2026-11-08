/**
 * Kanban Board / Projects View (Universal & Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;
  var T = global.StudioTemplates;

  function getIconSvg(name) {
    switch (name) {
      case "plus":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      case "trash":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      case "calendar":
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
      default:
        return "";
    }
  }

  function renderProjectCard(proj) {
    var S = global.StudioStore;
    var today = U.getTodayIso();
    var stats = S.getProjectStats(proj.id);

    var deadlineHtml = "";
    if (proj.due) {
      var diff = U.daysDifference(proj.due, today);
      var deadlineClass = "";
      var deadlineText = "";

      if (proj.phase === 3) {
        deadlineText = "تم التسليم · " + U.formatDateArabic(proj.due);
      } else if (diff < 0) {
        deadlineClass = "deadline-late";
        deadlineText = "متأخر " + Math.abs(diff) + " يوم · " + U.formatDateArabic(proj.due);
      } else if (diff === 0) {
        deadlineClass = "deadline-late";
        deadlineText = "موعد التسليم اليوم!";
      } else if (diff <= 7) {
        deadlineClass = "deadline-soon";
        deadlineText = "باقي " + diff + " أيام · " + U.formatDateArabic(proj.due);
      } else {
        deadlineText = "باقي " + diff + " يوم · " + U.formatDateArabic(proj.due);
      }

      deadlineHtml = '<div class="card-deadline ' + deadlineClass + '">' +
        getIconSvg("calendar") +
        '<span>' + deadlineText + '</span>' +
        '</div>';
    }

    return [
      '<div class="project-card" draggable="true" data-project-id="' + proj.id + '" tabindex="0">',
      '  <div class="card-top">',
      '    <div class="project-card-name">' + U.escapeHtml(proj.name) + '</div>',
      '    <button class="task-action-btn btn-delete" data-action="delete-project" data-id="' + proj.id + '" title="حذف المشروع">' + getIconSvg("trash") + '</button>',
      '  </div>',
      '  <div class="project-card-client">' + (proj.client ? U.escapeHtml(proj.client) : "بدون عميل محدد") + '</div>',
      deadlineHtml,
      '  <div class="card-progress-section" title="' + stats.completed + ' من أصل ' + stats.total + ' مهام مكتملة">',
      '    <div class="card-progress-labels">',
      '      <span>الإنجاز: ' + stats.percentage + '%</span>',
      '      <span>' + stats.open + ' مهام متبقية</span>',
      '    </div>',
      '    <div class="progress-bar-bg">',
      '      <div class="progress-bar-fill" style="width: ' + stats.percentage + '%"></div>',
      '    </div>',
      '  </div>',
      '  <div class="card-footer">',
      '    <select class="phase-select" data-action="change-phase" data-id="' + proj.id + '" aria-label="المرحلة">',
      T.PHASES.map(function (ph) {
        return '<option value="' + ph.id + '" ' + (ph.id === proj.phase ? "selected" : "") + '>' + ph.label + '</option>';
      }).join(""),
      '    </select>',
      '    <button class="btn-icon" data-action="quick-add-task" data-project-id="' + proj.id + '" title="إضافة مهمة لهذا المشروع">' + getIconSvg("plus") + '</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderKanbanView(options) {
    options = options || {};
    var searchQuery = (options.searchQuery || "").trim().toLowerCase();
    var S = global.StudioStore;
    var projects = S.getProjects();

    if (searchQuery) {
      projects = projects.filter(function (p) {
        var nameMatch = (p.name || "").toLowerCase().indexOf(searchQuery) !== -1;
        var clientMatch = (p.client || "").toLowerCase().indexOf(searchQuery) !== -1;
        return nameMatch || clientMatch;
      });
    }

    if (S.getProjects().length === 0) {
      return [
        '<div class="empty-state">',
        '  <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
        '  <h4>لا توجد مشاريع حتى الآن</h4>',
        '  <p>أنشئ مشروعك الأول لتتبع مراحله وجداوله الزمنية بدقة وسلاسة.</p>',
        '  <button class="btn btn-sm" id="emptyProjectBtn">+ أنشئ مشروعاً جديداً</button>',
        '</div>'
      ].join("");
    }

    return [
      '<div class="kanban-board" id="kanbanBoard">',
      T.PHASES.map(function (phase) {
        var phaseProjects = projects.filter(function (p) { return p.phase === phase.id; }).sort(function (a, b) {
          return (a.due || "9999").localeCompare(b.due || "9999");
        });

        return [
          '<div class="kanban-col" data-phase-col="' + phase.id + '">',
          '  <div class="col-header">',
          '    <div class="col-title"><span>' + phase.label + '</span></div>',
          '    <span class="col-count">' + phaseProjects.length + '</span>',
          '  </div>',
          '  <div class="col-cards-list" data-phase="' + phase.id + '">',
          phaseProjects.length > 0
            ? phaseProjects.map(renderProjectCard).join("")
            : '<div class="col-empty-hint">اسحب المشاريع هنا أو أضف مشروعاً جديداً</div>',
          '  </div>',
          '</div>'
        ].join("");
      }).join(""),
      '</div>'
    ].join("");
  }

  global.StudioKanbanView = {
    renderKanbanView: renderKanbanView
  };
})(window);
