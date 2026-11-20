/**
 * Studio Planner - Weekly Calendar & Week Number Module
 * Handles ISO / Arabic custom week number calculations, 
 * customizable week start days (Saturday, Sunday, Monday),
 * week navigation, and date range utilities.
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  var DAY_MAP = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  var DAY_NAMES_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  function CalendarWeek() {
    this.currentWeekOffset = parseInt(localStorage.getItem("studio_week_offset") || "0", 10) || 0;
    // اختيار الأسبوع يحدد العرض مباشرة.
    this.filterByWeek = localStorage.getItem("studio_week_filter") !== "false";
  }

  CalendarWeek.prototype.saveViewState = function () {
    localStorage.setItem("studio_week_offset", String(this.currentWeekOffset));
    localStorage.setItem("studio_week_filter", this.filterByWeek ? "true" : "false");
  };

  /**
   * Get user-selected week start day
   * @returns {'saturday' | 'sunday' | 'monday'}
   */
  CalendarWeek.prototype.getWeekStartDay = function () {
    if (global.StudioStore && global.StudioStore.getWeekStartDay) {
      return global.StudioStore.getWeekStartDay();
    }
    return localStorage.getItem("studio_week_start_day") || "saturday";
  };

  /**
   * Calculate Week Number for a given date according to chosen start day
   * @param {Date|string} dateInput
   * @param {string} startDayName - 'saturday'|'sunday'|'monday'
   * @returns {number} 1..53
   */
  CalendarWeek.prototype.getWeekNumber = function (dateInput, startDayName) {
    startDayName = startDayName || this.getWeekStartDay();
    var date = typeof dateInput === "string" ? new Date(dateInput + "T00:00:00") : new Date(dateInput);
    if (isNaN(date.getTime())) date = new Date();

    var target = new Date(date.valueOf());
    var startDayIndex = DAY_MAP[startDayName] !== undefined ? DAY_MAP[startDayName] : 6; // default saturday

    // Adjust target date to Thursday equivalent or start day
    var dayNr = (date.getDay() - startDayIndex + 7) % 7;
    target.setDate(target.getDate() - dayNr + 3);

    var firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }

    var weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
    return Math.max(1, Math.min(53, weekNum));
  };

  /**
   * Calculate the full date range of a week with offset
   * @param {number} offsetWeeks - relative to current week
   * @param {string} startDayName - 'saturday'|'sunday'|'monday'
   * @returns {object} { weekNumber, startDateIso, endDateIso, days: [...], label: string }
   */
  CalendarWeek.prototype.getWeekInfo = function (offsetWeeks, startDayName) {
    if (offsetWeeks === undefined) offsetWeeks = this.currentWeekOffset;
    startDayName = startDayName || this.getWeekStartDay();

    var now = new Date();
    // Add offset
    var baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (offsetWeeks * 7));

    var startDayIndex = DAY_MAP[startDayName] !== undefined ? DAY_MAP[startDayName] : 6;
    var currentDay = baseDate.getDay();
    var diffToStart = (currentDay - startDayIndex + 7) % 7;

    var startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - diffToStart);
    var days = [];

    for (var i = 0; i < 7; i++) {
      var d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      var month = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      var iso = d.getFullYear() + "-" + month + "-" + day;
      days.push({
        iso: iso,
        dateObj: d,
        dayNameAr: DAY_NAMES_AR[d.getDay()],
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1
      });
    }

    var startIso = days[0].iso;
    var endIso = days[6].iso;
    var weekNum = this.getWeekNumber(days[3].dateObj, startDayName);

    // Formatted range string in Arabic
    var startText = days[0].dayNumber + " " + this._getMonthNameAr(days[0].monthNumber);
    var endText = days[6].dayNumber + " " + this._getMonthNameAr(days[6].monthNumber);
    var rangeLabel = startText + " - " + endText;

    return {
      offset: offsetWeeks,
      weekNumber: weekNum,
      startDateIso: startIso,
      endDateIso: endIso,
      days: days,
      label: rangeLabel,
      isCurrentWeek: offsetWeeks === 0
    };
  };

  CalendarWeek.prototype._getMonthNameAr = function (monthNum) {
    var months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    return months[monthNum - 1] || "";
  };

  /**
   * Filter items that fall within the selected week
   */
  CalendarWeek.prototype.filterItemsForWeek = function (items, weekInfo) {
    if (!Array.isArray(items)) return [];
    var start = weekInfo.startDateIso;
    var end = weekInfo.endDateIso;
    return items.filter(function (item) {
      return item.date && item.date >= start && item.date <= end;
    });
  };

  /**
   * Render Weekly Calendar Toolbar HTML for Agenda View
   */
  CalendarWeek.prototype.renderWeeklyBarHtml = function () {
    var info = this.getWeekInfo();
    var weekStart = this.getWeekStartDay();
    var isFiltered = this.filterByWeek;

    var startDayLabels = {
      saturday: "السبت",
      sunday: "الأحد",
      monday: "الاثنين"
    };

    return [
      '<div class="weekly-calendar-bar" id="weeklyCalendarBar">',
      '  <div class="week-nav-group">',
      '    <button class="week-nav-btn" data-action="prev-week" title="الأسبوع السابق" aria-label="الأسبوع السابق">',
      '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
      '      <span>السابق</span>',
      '    </button>',
      '    <div class="week-info-badge ' + (info.isCurrentWeek ? "is-current-week" : "") + '">',
      '      <span class="week-number-pill">الأسبوع ' + info.weekNumber + '</span>',
      '      <span class="week-range-text">' + info.label + '</span>',
      '    </div>',
      '    <button class="week-nav-btn" data-action="next-week" title="الأسبوع القادم" aria-label="الأسبوع القادم">',
      '      <span>القادم</span>',
      '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
      '    </button>',
      (!info.isCurrentWeek ? '    <button class="week-today-btn" data-action="current-week" title="الرجوع للأسبوع الحالي">هذا الأسبوع</button>' : ''),
      '  </div>',
      '  <div class="week-actions-group">',
      '    <button class="week-filter-toggle ' + (isFiltered ? "active" : "") + '" data-action="toggle-week-filter" title="حصر العرض في مهام هذا الأسبوع فقط">',
      '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      '      <span>' + (isFiltered ? "عرض الأسبوع المحدد" : "عرض جميع الأسابيع") + '</span>',
      '    </button>',
      '    <div class="week-start-selector-wrapper" title="تحديد يوم بداية الأسبوع">',
      '      <span class="selector-label">يبدأ:</span>',
      '      <select id="weekStartDaySelect" class="week-start-select" data-action="change-week-start" aria-label="بداية الأسبوع">',
      '        <option value="saturday" ' + (weekStart === "saturday" ? "selected" : "") + '>السبت</option>',
      '        <option value="sunday" ' + (weekStart === "sunday" ? "selected" : "") + '>الأحد</option>',
      '        <option value="monday" ' + (weekStart === "monday" ? "selected" : "") + '>الاثنين</option>',
      '      </select>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("");
  };

  global.StudioCalendarWeek = new CalendarWeek();
})(window);
