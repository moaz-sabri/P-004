/** Shared view markup helpers. Keep repeated page structure in one place. */
(function (global) {
  "use strict";

  function attr(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function pageSection(title, action, content, extraClass) {
    return '<section class="view-section ' + (extraClass || "") + '">' +
      '<div class="view-section-header"><h3>' + attr(title) + '</h3>' + (action || "") + '</div>' +
      (content || "") + '</section>';
  }

  function grid(items, render) {
    return '<div class="view-card-grid">' + items.map(render).join("") + '</div>';
  }

  function empty(title, message, action) {
    return '<div class="empty-state"><h4>' + attr(title) + '</h4><p>' + attr(message) + '</p>' + (action || "") + '</div>';
  }

  global.StudioViewTemplates = { pageSection: pageSection, grid: grid, empty: empty };
})(window);
