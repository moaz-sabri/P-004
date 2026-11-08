/**
 * Stats View (Universal & Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  function renderStats(containerElement, dateElement) {
    if (dateElement && U) {
      dateElement.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>' + U.formatDateArabic(U.getTodayIso()) + '</span>';
    }

    if (!containerElement || !global.StudioStore) return;

    var stats = global.StudioStore.getStats();

    containerElement.innerHTML = [
      '<div class="stat-card stat-today" title="المهام والمواعيد المجدولة لليوم">',
      '  <b>' + stats.today + '</b>',
      '  <span>اليوم</span>',
      '</div>',
      '<div class="stat-card" title="المهام والمواعيد خلال الأيام السبعة القادمة">',
      '  <b>' + stats.week + '</b>',
      '  <span>هذا الأسبوع</span>',
      '</div>',
      '<div class="stat-card ' + (stats.late > 0 ? "stat-late" : "") + '" title="مهام تجاوز موعدها ولم تكتمل بعد">',
      '  <b>' + stats.late + '</b>',
      '  <span>متأخر</span>',
      '</div>',
      '<div class="stat-card" title="المشاريع التي ما تزال قيد التنفيذ">',
      '  <b>' + stats.activeProjects + '</b>',
      '  <span>مشاريع جارية</span>',
      '</div>'
    ].join("");
  }

  global.StudioStatsView = {
    renderStats: renderStats
  };
})(window);
