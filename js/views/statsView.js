/**
 * Stats View (Universal & Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  function renderStats(containerElement, dateElement) {
    if (dateElement && U) {
      dateElement.textContent = U.formatDateArabic(U.getTodayIso());
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
