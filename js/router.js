/**
 * Small multi-page router.
 * Keeps navigation predictable for direct links, local files and PWA launches.
 */
(function (global) {
  "use strict";

  var routes = {
    agenda: "/",
    projects: "/projects",
    clients: "/clients",
    settings: "/settings",
    guide: "/guide"
  };

  function getPageKey() {
    var page = document.body && document.body.dataset ? document.body.dataset.page : "agenda";
    return routes[page] ? page : "agenda";
  }

  function resolve(key) {
    return routes[key] || routes.agenda;
  }

  function markActive() {
    var current = getPageKey();
    document.querySelectorAll(".nav-tab[data-route]").forEach(function (link) {
      var active = link.dataset.route === current;
      link.setAttribute("aria-current", active ? "page" : "false");
      link.classList.toggle("is-active", active);
    });
  }

  function init() {
    markActive();
    document.addEventListener("click", function (event) {
      var link = event.target.closest("a[data-route]");
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var key = link.dataset.route;
      if (!routes[key]) return;
      event.preventDefault();
      if (key === getPageKey()) return;
      window.location.assign(resolve(key));
    });
  }

  global.StudioRouter = { routes: routes, resolve: resolve, init: init, markActive: markActive };
})(window);
