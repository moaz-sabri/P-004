/**
 * Entities View (Universal & Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;
  var T = global.StudioViewTemplates;

  function getIconSvg(name) {
    switch (name) {
      case "user":
        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      case "phone":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
      case "edit":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      case "trash":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      case "open":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      default:
        return "";
    }
  }

  function renderClientCard(client) {
    var S = global.StudioStore;
    var tasks = S.getItemsForClient(client);
    var projects = S.getProjectsForClient(client);
    var openTasks = tasks.filter(function (t) { return !t.done; }).length;
    var doneTasks = tasks.filter(function (t) { return t.done; }).length;

    return [
      '<div class="project-card entity-card" data-client-id="' + client.id + '">',
      '  <div class="card-top">',
      '    <div class="project-card-name">' + U.escapeHtml(client.name) + '</div>',
      '    <div style="display:flex; gap:6px;">',
      '      <button class="task-action-btn" data-action="open-client" data-id="' + client.id + '" title="فتح الجهة">' + getIconSvg("open") + '</button>',
      '      <button class="task-action-btn" data-action="edit-client" data-id="' + client.id + '" title="تعديل">' + getIconSvg("edit") + '</button>',
      '      <button class="task-action-btn btn-delete" data-action="delete-client" data-id="' + client.id + '" title="حذف">' + getIconSvg("trash") + '</button>',
      '    </div>',
      '  </div>',
      client.phone ? '  <div class="project-card-client">' + getIconSvg("phone") + ' <span dir="ltr">' + U.escapeHtml(client.phone) + '</span></div>' : (client.email ? '  <div class="project-card-client">' + U.escapeHtml(client.email) + '</div>' : '  <div class="project-card-client" style="color:var(--ink-muted)">بدون معلومات تواصل</div>'),
      '  <div class="card-progress-section" title="المهام"> ',
      '    <div class="card-progress-labels">',
      '      <span>المشاريع: ' + projects.length + '</span>',
      '      <span>المهام: ' + tasks.length + ' (مكتمل ' + doneTasks + ')</span>',
      '    </div>',
      '    <div class="progress-bar-bg">',
      '      <div class="progress-bar-fill" style="width: ' + (tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0) + '%"></div>',
      '    </div>',
      '  </div>',
      '  <div class="card-footer">',
      '    <span class="meta-item" style="color:var(--ink-muted); font-size:0.8rem;">' + (openTasks > 0 ? (openTasks + ' مهام مفتوحة') : 'لا توجد مهام مفتوحة') + '</span>',
      '    <button class="btn-icon btn-sm" data-action="open-client" data-id="' + client.id + '" title="فتح">فتح</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderProjectCard(project) {
    var S = global.StudioStore;
    var tasks = S.getItems().filter(function (item) { return String(item.pid || "") === String(project.id); });
    var doneTasks = tasks.filter(function (item) { return item.done; }).length;
    return [
      '<div class="project-card client-card" data-project-id="' + project.id + '">',
      '  <div class="card-top">',
      '    <div class="project-card-name">' + U.escapeHtml(project.name) + '</div>',
      '    <div style="display:flex; gap:6px;">',
      '      <button class="task-action-btn" data-action="open-project-detail" data-id="' + project.id + '" title="فتح المشروع">' + getIconSvg("open") + '</button>',
      '      <button class="task-action-btn" data-action="edit-project" data-id="' + project.id + '" title="تعديل المشروع">' + getIconSvg("edit") + '</button>',
      '    </div>',
      '  </div>',
      '  <div class="project-card-client">' + (project.client ? U.escapeHtml(project.client) : 'بدون جهة محددة') + '</div>',
      '  <div class="card-progress-section" title="المهام المرتبطة">',
      '    <div class="card-progress-labels"><span>المهام: ' + tasks.length + '</span><span>مكتمل ' + doneTasks + '</span></div>',
      '    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ' + (tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0) + '%"></div></div>',
      '  </div>',
      '  <div class="card-footer"><span class="meta-item" style="color:var(--ink-muted); font-size:0.8rem;">' + (tasks.length ? tasks.length + ' مهام مرتبطة' : 'لا توجد مهام بعد') + '</span><button class="btn-icon btn-sm" data-action="open-project-detail" data-id="' + project.id + '">فتح</button></div>',
      '</div>'
    ].join("");
  }

  function renderClientsView(options) {
    options = options || {};
    var searchQuery = (options.searchQuery || "").trim().toLowerCase();
    var projectOnly = options.projectOnly === true;
    var S = global.StudioStore;
    var entities = S.getClients();
    var projects = S.getProjects();

    if (projectOnly) {
      if (searchQuery) projects = projects.filter(function (project) { return (project.name || "").toLowerCase().indexOf(searchQuery) !== -1 || (project.client || "").toLowerCase().indexOf(searchQuery) !== -1; });
      return T.pageSection("قائمة المشاريع (" + projects.length + ")", '<button class="btn btn-sm" onclick="StudioModalView.openProjectModal()">+ مشروع جديد</button>', projects.length ? T.grid(projects, renderProjectCard) : T.empty("لا توجد مشاريع حتى الآن", "أضف أول مشروع لربطه بالمهام والجهات.", '<button class="btn btn-sm" onclick="StudioModalView.openProjectModal()">+ إضافة مشروع</button>'));
    }

    if (searchQuery) {
      entities = entities.filter(function (c) {
        var nameMatch = (c.name || "").toLowerCase().indexOf(searchQuery) !== -1;
        var phoneMatch = (c.phone || "").toLowerCase().indexOf(searchQuery) !== -1;
        var emailMatch = (c.email || "").toLowerCase().indexOf(searchQuery) !== -1;
        return nameMatch || phoneMatch || emailMatch;
      });
    }

    if (S.getClients().length === 0 && projects.length === 0) {
      return T.empty("لا توجد جهات حتى الآن", "أضف جهتك الأولى لربطها بالمهام والمشاريع ومتابعتها من مكان واحد.", '<button class="btn btn-sm" onclick="StudioModalView.openClientModal()">+ إضافة جهة جديدة</button>');
    }

    if (entities.length === 0) return T.empty("لا توجد نتائج مطابقة", "جرّب تغيير عبارة البحث.", '<button class="btn btn-sm" onclick="StudioModalView.openClientModal()">+ إضافة جهة جديدة</button>');

    return T.pageSection("قائمة الجهات (" + entities.length + ")", '<button class="btn btn-sm" onclick="StudioModalView.openClientModal()">+ جهة جديدة</button>', T.grid(entities, renderClientCard)) +
      T.pageSection("قائمة المشاريع (" + projects.length + ")", '<button class="btn btn-sm" onclick="StudioModalView.openProjectModal()">+ مشروع جديد</button>', projects.length ? T.grid(projects, renderProjectCard) : T.empty("لا توجد مشاريع حتى الآن", "أضف أول مشروع لربطه بالمهام والجهات."));
  }

  global.StudioEntitiesView = {
    renderEntitiesView: renderClientsView,
    renderClientsView: renderClientsView,
    getIconSvg: getIconSvg
  };
  global.StudioClientsView = global.StudioEntitiesView;
})(window);
