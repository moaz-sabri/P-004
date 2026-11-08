/**
 * Clients View (Universal & Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

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
      '<div class="project-card client-card" data-client-id="' + client.id + '">',
      '  <div class="card-top">',
      '    <div class="project-card-name">' + U.escapeHtml(client.name) + '</div>',
      '    <div style="display:flex; gap:6px;">',
      '      <button class="task-action-btn" data-action="open-client" data-id="' + client.id + '" title="فتح العميل">' + getIconSvg("open") + '</button>',
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

  function renderClientsView(options) {
    options = options || {};
    var searchQuery = (options.searchQuery || "").trim().toLowerCase();
    var S = global.StudioStore;
    var clients = S.getClients();

    if (searchQuery) {
      clients = clients.filter(function (c) {
        var nameMatch = (c.name || "").toLowerCase().indexOf(searchQuery) !== -1;
        var phoneMatch = (c.phone || "").toLowerCase().indexOf(searchQuery) !== -1;
        var emailMatch = (c.email || "").toLowerCase().indexOf(searchQuery) !== -1;
        return nameMatch || phoneMatch || emailMatch;
      });
    }

    if (S.getClients().length === 0) {
      return [
        '<div class="empty-state">',
        '  <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        '  <h4>لا يوجد عملاء حتى الآن</h4>',
        '  <p>أضف عميلك الأول لربطه بالمهام والمشاريع ومتابعته من مكان واحد.</p>',
        '  <button class="btn btn-sm" id="emptyClientBtn" onclick="StudioModalView.openClientModal()">+ إضافة عميل جديد</button>',
        '</div>'
      ].join("");
    }

    if (clients.length === 0) {
      return [
        '<div class="empty-state">',
        '  <h4>لا توجد نتائج مطابقة</h4>',
        '  <p>جرّب تغيير عبارة البحث.</p>',
        '  <button class="btn btn-sm" onclick="StudioModalView.openClientModal()">+ إضافة عميل جديد</button>',
        '</div>'
      ].join("");
    }

    var toolbar = [
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">',
      '  <h3 style="margin:0; font-size:1.05rem; color:var(--ink-primary);">قائمة العملاء (' + clients.length + ')</h3>',
      '  <button class="btn btn-sm" onclick="StudioModalView.openClientModal()">+ عميل جديد</button>',
      '</div>',
      '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">'
    ].join("");

    return toolbar + clients.map(renderClientCard).join("") + '</div>';
  }

  global.StudioClientsView = {
    renderClientsView: renderClientsView,
    getIconSvg: getIconSvg
  };
})(window);