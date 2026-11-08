/**
 * Utilities & Helper Functions (100% Local, Offline Compatible)
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    var map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return String(str).replace(/[&<>"']/g, function (c) { return map[c]; });
  }

  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().slice(0, 8);
    }
    return Math.random().toString(36).substring(2, 10);
  }

  function getTodayIso() {
    var now = new Date();
    var tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
  }

  function addDaysIso(days, baseDate) {
    var d = typeof baseDate === "string" ? new Date(baseDate + "T00:00:00") : (baseDate ? new Date(baseDate) : new Date());
    d.setDate(d.getDate() + days);
    var tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  }

  function daysDifference(dateStr, baseToday) {
    if (!dateStr) return 0;
    var todayStr = baseToday || getTodayIso();
    var d1 = new Date(dateStr + "T00:00:00");
    var d2 = new Date(todayStr + "T00:00:00");
    return Math.round((d1 - d2) / 86400000);
  }

  function formatDateArabic(dateStr) {
    if (!dateStr) return "";
    try {
      var d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("ar-EG", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
    } catch (e) {
      return dateStr;
    }
  }

  function getRelativeDateHeading(dateStr, today) {
    var diff = daysDifference(dateStr, today || getTodayIso());
    if (diff === 0) return "اليوم";
    if (diff === 1) return "غداً";
    if (diff === -1) return "أمس";
    return formatDateArabic(dateStr);
  }

  function debounce(fn, delay) {
    var timer;
    delay = delay || 200;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  function downloadJsonFile(filename, data) {
    var jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    var blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== "string") return "";
    var cleanHex = hex.replace("#", "").trim();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map(function (c) { return c + c; }).join("");
    }
    if (cleanHex.length !== 6) return "";
    var num = parseInt(cleanHex, 16);
    if (isNaN(num)) return "";
    var r = (num >> 16) & 255;
    var g = (num >> 8) & 255;
    var b = num & 255;
    var a = alpha !== undefined ? alpha : 1;
    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
  }

  global.StudioUtils = {
    escapeHtml: escapeHtml,
    generateId: generateId,
    getTodayIso: getTodayIso,
    addDaysIso: addDaysIso,
    daysDifference: daysDifference,
    formatDateArabic: formatDateArabic,
    getRelativeDateHeading: getRelativeDateHeading,
    debounce: debounce,
    downloadJsonFile: downloadJsonFile,
    hexToRgba: hexToRgba
  };
})(window);
