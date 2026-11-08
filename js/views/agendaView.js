/**
 * Agenda View (Universal & Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;
  var T = global.StudioTemplates;

  function getIconSvg(name) {
    switch (name) {
      case "phone":
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
      case "clock":
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      case "edit":
        return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
      case "trash":
        return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      case "flag":
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
      default:
        return "";
    }
  }

  function renderItemRow(item) {
    var S = global.StudioStore;
    var isProjMilestone = item.source === "project-delivery";
    var proj = S.getProject(item.pid);
    var kindMeta = S.getCategoryMeta ? S.getCategoryMeta(item.kind) : (T.KINDS[item.kind] || { label: "مهمة", colorClass: "tag-task", color: "#1f6355" });

    var tagStyle = "";
    if (kindMeta.color) {
      var tagBg = U.hexToRgba(kindMeta.color, 0.12);
      var tagBorder = U.hexToRgba(kindMeta.color, 0.28);
      tagStyle = 'style="background-color: ' + tagBg + '; color: ' + kindMeta.color + '; border-color: ' + tagBorder + ';"';
    }

    var checkHtml = isProjMilestone
      ? '<div class="delivery-bullet" title="موعد تسليم مشروع">' + getIconSvg("flag") + '</div>'
      : '<label class="task-checkbox-label"><input type="checkbox" class="task-checkbox" data-action="toggle-item" data-id="' + item.id + '" ' + (item.done ? "checked" : "") + ' aria-label="تحديد كمكتمل"></label>';

    var actionsHtml = isProjMilestone
      ? ""
      : '<div class="task-actions">' +
        '  <button class="task-action-btn" data-action="edit-item" data-id="' + item.id + '" title="تعديل">' + getIconSvg("edit") + '</button>' +
        '  <button class="task-action-btn btn-delete" data-action="delete-item" data-id="' + item.id + '" title="حذف">' + getIconSvg("trash") + '</button>' +
        '</div>';

    var phoneHtml = item.phone
      ? '<span class="meta-item meta-phone"><a href="tel:' + U.escapeHtml(item.phone) + '" title="اتصال">' + getIconSvg("phone") + '<span>' + U.escapeHtml(item.phone) + '</span></a></span>'
      : "";

    var timeHtml = item.time
      ? '<span class="meta-item">' + getIconSvg("clock") + '<span>' + U.escapeHtml(item.time) + '</span></span>'
      : "";

    var projectBadge = proj
      ? '<span class="meta-item meta-project">' + U.escapeHtml(proj.name) + '</span>'
      : '<span class="meta-item" style="color:var(--ink-muted)">بدون مشروع</span>';

    var whoHtml = item.who ? '<span class="meta-item">· ' + U.escapeHtml(item.who) + '</span>' : "";

    return [
      '<div class="task-row ' + (item.done ? "is-done" : "") + '" data-id="' + item.id + '">',
      checkHtml,
      '  <div class="task-content" ' + (!isProjMilestone ? 'data-action="edit-item" data-id="' + item.id + '"' : "") + '>',
      '    <div class="task-title">' + U.escapeHtml(item.title) + '</div>',
      '    <div class="task-meta">',
      timeHtml,
      projectBadge,
      whoHtml,
      phoneHtml,
      '    </div>',
      '  </div>',
      '  <span class="tag ' + (kindMeta.colorClass || "") + '" ' + tagStyle + '>' + U.escapeHtml(kindMeta.label) + '</span>',
      actionsHtml,
      '</div>'
    ].join("");
  }

  function renderAgendaView(options) {
    options = options || {};
    var activeFilter = options.activeFilter || "all";
    var searchQuery = options.searchQuery || "";
    var S = global.StudioStore;
    var today = U.getTodayIso();

    var allItems = S.getUnifiedItems({ kind: activeFilter, query: searchQuery });
    var baseItems = S.getUnifiedItems({ query: searchQuery });
    var categories = S.getCategories ? S.getCategories() : [];

    var chipCounts = { all: baseItems.length };
    for (var b = 0; b < baseItems.length; b++) {
      var itemKind = baseItems[b].kind || "task";
      chipCounts[itemKind] = (chipCounts[itemKind] || 0) + 1;
    }

    // Only render categories that have actual items (value > 0) or are currently active
    var visibleCategories = categories.filter(function (cat) {
      return (chipCounts[cat.id] || 0) > 0 || activeFilter === cat.id;
    });

    // Check if there are other kinds in baseItems not in categories (e.g., delivery or legacy)
    var catIds = categories.map(function (c) { return c.id; });
    for (var kindKey in chipCounts) {
      if (chipCounts.hasOwnProperty(kindKey) && kindKey !== "all" && catIds.indexOf(kindKey) === -1 && chipCounts[kindKey] > 0) {
        var meta = S.getCategoryMeta(kindKey);
        visibleCategories.push(meta);
      }
    }

    var chipsButtonsHtml = [
      '<button class="chip-btn" data-filter="all" aria-pressed="' + (activeFilter === "all") + '">',
      '  <span>الكل</span>',
      '  <span class="chip-badge">' + (chipCounts.all || 0) + '</span>',
      '</button>'
    ].concat(visibleCategories.map(function (cat) {
      var count = chipCounts[cat.id] || 0;
      var dotStyle = cat.color ? 'style="background-color:' + cat.color + ';"' : "";
      return '<button class="chip-btn" data-filter="' + cat.id + '" aria-pressed="' + (activeFilter === cat.id) + '">' +
        '<span class="chip-dot" ' + dotStyle + '></span>' +
        '<span>' + U.escapeHtml(cat.label) + '</span>' +
        '<span class="chip-badge">' + count + '</span>' +
        '</button>';
    })).join("");

    var quickAddOptionsHtml = categories.map(function (c) {
      return '<option value="' + c.id + '">' + U.escapeHtml(c.label) + '</option>';
    }).join("");

    var chipsHtml = [
      '<div class="chips-bar-container">',
      '  <div class="chips-wrapper" role="toolbar" aria-label="تصنيفات المهام">',
      chipsButtonsHtml,
      '  </div>',
      '  <button class="chip-manage-btn" id="openCategoryManagerBtn" title="إدارة وإضافة الأقسام والتصنيفات" aria-label="إدارة التصنيفات">',
      '    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
      '    <span>إدارة الأقسام</span>',
      '  </button>',
      '</div>',
      '<form class="quick-add-bar" id="quickAddForm" autocomplete="off">',
      '  <span class="quick-add-icon" title="إضافة سريعة">',
      '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      '  </span>',
      '  <input type="text" id="quickAddInput" class="quick-add-input" placeholder="إضافة سريعة... اكتب المهمة واضغط Enter مباشرة" required>',
      '  <select id="quickAddKind" class="quick-add-select" aria-label="نوع المهمة">',
      quickAddOptionsHtml,
      '  </select>',
      '  <button type="submit" class="quick-add-submit"><span>إضافة</span></button>',
      '</form>'
    ].join("");

    if (allItems.length === 0) {
      var isSearch = searchQuery.trim() || activeFilter !== "all";
      return chipsHtml + [
        '<div class="empty-state">',
        '  <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        '  <h4>' + (isSearch ? "لا توجد نتائج مطابقة" : "الأجندة فارغة حالياً") + '</h4>',
        '  <p>' + (isSearch ? "جرّب تغيير عبارة البحث أو اختيار تصنيف آخر." : "ابدأ بإضافة أول مهمة أو موعد من الشريط أعلاه.") + '</p>',
        '</div>'
      ].join("");
    }

    var openItems = allItems.filter(function (i) { return !i.done; }).sort(function (a, b) {
      var d = (a.date || "").localeCompare(b.date || "");
      if (d !== 0) return d;
      return (a.time || "").localeCompare(b.time || "");
    });

    var doneItems = allItems.filter(function (i) { return i.done; }).sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });

    var lateItems = openItems.filter(function (i) { return i.date < today; });
    var upcomingItems = openItems.filter(function (i) { return i.date >= today; });

    var output = chipsHtml;

    if (lateItems.length > 0) {
      output += '<section class="agenda-section">' +
        '<h3 class="agenda-group-title group-late"><span>متأخر</span><span class="count-badge">' + lateItems.length + '</span></h3>' +
        lateItems.map(renderItemRow).join("") +
        '</section>';
    }

    if (upcomingItems.length > 0) {
      var curDate = null;
      var curGroup = [];

      var flush = function () {
        if (curDate && curGroup.length > 0) {
          var title = U.getRelativeDateHeading(curDate, today);
          output += '<section class="agenda-section">' +
            '<h3 class="agenda-group-title"><span>' + title + '</span><span class="count-badge">' + curGroup.length + '</span></h3>' +
            curGroup.map(renderItemRow).join("") +
            '</section>';
          curGroup = [];
        }
      };

      for (var i = 0; i < upcomingItems.length; i++) {
        var it = upcomingItems[i];
        if (it.date !== curDate) {
          flush();
          curDate = it.date;
        }
        curGroup.push(it);
      }
      flush();
    }

    if (doneItems.length > 0) {
      output += '<section class="agenda-section">' +
        '<h3 class="agenda-group-title"><span>منجز</span><span class="count-badge">' + doneItems.length + '</span></h3>' +
        doneItems.map(renderItemRow).join("") +
        '</section>';
    }

    return output;
  }

  global.StudioAgendaView = {
    renderAgendaView: renderAgendaView
  };
})(window);
