/**
 * Studio Planner - Auth Manager
 * Manages user authentication, token storage, and session state.
 * Enforces registered account requirement for online sync,
 * while allowing local-only guest work offline.
 */
(function (global) {
  "use strict";

  var USER_KEY = "studio_auth_user";
  function csrfToken() {
    var match = document.cookie.match(/(?:^|; )studio_csrf=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function AuthManager() {
    this.token = "";
    this.user = this._loadUser();
    this.listeners = [];
  }

  AuthManager.prototype._loadUser = function () {
    try {
      var saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  };

  AuthManager.prototype.getUser = function () {
    return this.user;
  };

  AuthManager.prototype.getToken = function () {
    return this.token;
  };

  AuthManager.prototype.getCsrfToken = csrfToken;

  AuthManager.prototype.isLoggedIn = function () {
    return !!this.user;
  };

  AuthManager.prototype.subscribe = function (fn) {
    this.listeners.push(fn);
    var self = this;
    return function () {
      self.listeners = self.listeners.filter(function (l) { return l !== fn; });
    };
  };

  AuthManager.prototype._notify = function () {
    for (var i = 0; i < this.listeners.length; i++) {
      try {
        this.listeners[i](this.user, this.isLoggedIn());
      } catch (e) {
        console.error("Auth listener error:", e);
      }
    }
  };

  AuthManager.prototype.claimLocalData = function () {
    if (!this.user) return Promise.resolve(null);
    var S = global.StudioStore;
    var U = global.StudioUtils;
    if (!S) return Promise.resolve(null);

    var projects = S.getProjects();
    var items = S.getItems();
    var clients = S.getClients();

    if (projects.length === 0 && items.length === 0 && clients.length === 0) {
      return Promise.resolve(null);
    }

    var options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.token ? "Bearer " + this.token : "",
        "X-CSRF-Token": csrfToken()
      },
      credentials: "include",
      body: JSON.stringify({
        projects: projects,
        items: items,
        clients: clients
      })
    };

    var fetcher = (U && U.safeFetchJson)
      ? U.safeFetchJson("/api/auth/claim_local_data", options)
      : fetch("/api/auth/claim_local_data", options).then(function (r) { return r.json(); });

    return fetcher.catch(function (err) {
      // Do not complete login/registration while local data is known not to
      // have been associated with the account. The caller can retry safely.
      throw new Error("تم تسجيل الدخول، لكن تعذر ربط البيانات المحلية. أعد المحاولة عند توفر الاتصال.");
    });
  };

  AuthManager.prototype.login = function (username, password) {
    var self = this;
    var U = global.StudioUtils;
    var options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: username, password: password })
    };

    var fetcher = (U && U.safeFetchJson)
      ? U.safeFetchJson("/api/auth/login", options)
      : fetch("/api/auth/login", options).then(function (r) { return r.json(); });

    return fetcher
      .then(function (data) {
        if (!data || !data.success) {
          throw new Error((data && data.error) ? data.error : "اسم المستخدم أو كلمة المرور غير صحيحة.");
        }
        self.token = data.token;
        self.user = data.user;
        // Session is maintained by the HttpOnly cookie; token storage remains
        // only for backward compatibility with older deployments.
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        if (data.settings && global.StudioStore) {
          if (data.settings.weekStartDay) {
            global.StudioStore.setWeekStartDay(data.settings.weekStartDay, false);
          }
        }

        // Claim and associate offline-created data to this account
        return self.claimLocalData().then(function () {
          self._notify();
          if (global.StudioSync) global.StudioSync.sync();
          return data;
        });
      });
  };

  AuthManager.prototype.register = function (username, password, name, email) {
    var self = this;
    var U = global.StudioUtils;
    var options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: username, password: password, name: name, email: email })
    };

    var fetcher = (U && U.safeFetchJson)
      ? U.safeFetchJson("/api/auth/register", options)
      : fetch("/api/auth/register", options).then(function (r) { return r.json(); });

    return fetcher
      .then(function (data) {
        if (!data || !data.success) {
          throw new Error((data && data.error) ? data.error : "تعذر إنشاء الحساب، يرجى المحاولة لاحقاً.");
        }
        self.token = data.token;
        self.user = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        // Claim and associate all local offline items to the newly registered user
        return self.claimLocalData().then(function () {
          self._notify();
          if (global.StudioSync) global.StudioSync.sync();
          return data;
        });
      });
  };

  AuthManager.prototype.logout = function () {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(function (err) {
      console.warn("Logout request failed; local session cleared:", err);
    });
    this.token = "";
    this.user = null;
    localStorage.removeItem(USER_KEY);
    this._notify();
  };

  AuthManager.prototype.verifySession = function () {
    var self = this;
    var U = global.StudioUtils;
    var options = {
      headers: { "Authorization": self.token ? "Bearer " + self.token : "" },
      credentials: "include"
    };

    var fetcher = (U && U.safeFetchJson)
      ? U.safeFetchJson("/api/auth/me", options)
      : fetch("/api/auth/me", options).then(function (r) { return r.json(); });

    return fetcher
      .then(function (data) {
        if (data && data.success && data.user) {
          self.user = data.user;
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          self._notify();
          return data.user;
        }
        self.logout();
        return null;
      })
      .catch(function () {
        // If offline or network error, keep cached user session
        return self.user;
      });
  };

  global.StudioAuth = new AuthManager();
})(window);
