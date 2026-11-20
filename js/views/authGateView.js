/**
 * Studio Planner - Auth Gate View (Mandatory Login / Register on Web)
 * Prevents using the site online/on web without an account.
 * When authenticated, claims and associates local offline data to the registered user.
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  function AuthGateView() {
    this.container = null;
    this.activeTab = "login"; // 'login' | 'register'
  }

  AuthGateView.prototype.init = function () {
    this.container = document.getElementById("authGateContainer");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "authGateContainer";
      var mainNav = document.querySelector(".main-nav");
      var appContainer = document.querySelector(".app-container");
      if (mainNav && mainNav.parentNode) {
        mainNav.parentNode.insertBefore(this.container, mainNav);
      } else if (appContainer) {
        appContainer.appendChild(this.container);
      }
    }
    this.checkGate();
  };

  /**
   * Determine whether the auth gate should lock the app.
   * - Web / Online (HTTP / HTTPS / localhost): MUST be logged in. Guest not allowed.
   * - Local standalone / Offline file (file:/// or installed PWA disconnected): Guest allowed.
   */
  AuthGateView.prototype.shouldLock = function () {
    var Auth = global.StudioAuth;
    if (!Auth) return false;
    if (Auth.isLoggedIn()) return false;

    // Local downloaded file mode (file://)
    if (window.location.protocol === "file:") {
      return false;
    }

    // Installed PWA running while offline
    var isStandalonePwa = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalonePwa && !navigator.onLine) {
      return false;
    }

    // In all web scenarios, lock until user logs in or registers
    return true;
  };

  AuthGateView.prototype.checkGate = function () {
    if (!this.container) {
      this.container = document.getElementById("authGateContainer");
    }

    if (this.shouldLock()) {
      document.body.classList.add("auth-locked");
      if (this.container) {
        this.container.style.display = "block";
        this.render();
      }
    } else {
      document.body.classList.remove("auth-locked");
      if (this.container) {
        this.container.style.display = "none";
        this.container.innerHTML = "";
      }
    }
  };

  AuthGateView.prototype.render = function () {
    if (!this.container) return;

    var S = global.StudioStore;
    var localProjectsCount = S ? S.getProjects().length : 0;
    var localItemsCount = S ? S.getItems().length : 0;
    var totalLocalRecords = localProjectsCount + localItemsCount;

    var html = [
      '<div class="auth-gate-wrapper">',
      '  <div class="auth-gate-card">',
      '    <div class="auth-gate-header">',
      '      <div class="auth-gate-icon">',
      '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '          <path d="M12 2L2 7l10 5 10-5-10-5z"/>',
      '          <path d="M2 17l10 5 10-5"/>',
      '          <path d="M2 12l10 5 10-5"/>',
      '        </svg>',
      '      </div>',
      '      <h2 class="auth-gate-title">دفتر</h2>',
      '      <p class="auth-gate-subtitle">تسجيل الدخول ومزامنة المواعيد والمشاريع</p>',
      '    </div>',

      '    <div class="auth-gate-notice">',
      '      <div class="auth-notice-icon">🔒</div>',
      '      <div class="auth-notice-text">',
      '        <strong>مرحباً بك!</strong> لحماية بياناتك ومزامنة أعمالك مع الخادم السحابي، يلزم تسجيل الدخول أو إنشاء حساب جديد. إذا كنت تفضل العمل على جهازك محلياً بدون حساب وبدون إنترنت، يمكنك تثبيت التطبيق بالزر المخصص أدناه.',
      '      </div>',
      '    </div>',

      (totalLocalRecords > 0 ? [
        '<div class="auth-local-claim-box">',
        '  <span class="claim-icon">✨</span>',
        '  <div class="claim-text">',
        '    تم العثور على <strong>' + totalLocalRecords + '</strong> من المهام والمشاريع على هذا الجهاز.',
        '    <strong>سيتم تلقائياً حفظها ونقلها إلى حسابك</strong> فور تسجيل الدخول.',
        '  </div>',
        '</div>'
      ].join("") : ""),

      '    <div class="auth-tabs">',
      '      <button type="button" class="auth-tab-btn ' + (this.activeTab === "login" ? "active" : "") + '" id="gateTabLogin">',
      '        تسجيل الدخول',
      '      </button>',
      '      <button type="button" class="auth-tab-btn ' + (this.activeTab === "register" ? "active" : "") + '" id="gateTabRegister">',
      '        إنشاء حساب جديد',
      '      </button>',
      '    </div>',

      '    <div id="gateErrorBox" class="auth-error-msg" style="display:none;"></div>',

      // Login Form
      '    <form id="gateLoginForm" novalidate style="' + (this.activeTab === "login" ? "" : "display:none;") + '">',
      '      <div class="form-group">',
      '        <label for="gateLoginUser">اسم المستخدم <span style="color:var(--color-late)">*</span></label>',
      '        <input type="text" id="gateLoginUser" class="form-control" autocomplete="username" placeholder="مثال: admin" value="admin">',
      '      </div>',
      '      <div class="form-group">',
      '        <label for="gateLoginPass">كلمة المرور <span style="color:var(--color-late)">*</span></label>',
      '        <input type="password" id="gateLoginPass" class="form-control" autocomplete="current-password" placeholder="••••••••">',
      '      </div>',
      '      <button type="submit" class="btn btn-block" style="padding: 12px; font-size: 1rem; margin-top: 14px;" id="gateLoginSubmitBtn">',
      '        <span>دخول إلى دفتر ومزامنة البيانات</span>',
      '      </button>',
      '    </form>',

      // Register Form
      '    <form id="gateRegisterForm" novalidate style="' + (this.activeTab === "register" ? "" : "display:none;") + '">',
      '      <div class="form-group">',
      '        <label for="gateRegName">الاسم الشخصي أو اسم الاستوديو</label>',
      '        <input type="text" id="gateRegName" class="form-control" placeholder="مثال: استوديو الإبداع">',
      '      </div>',
      '      <div class="form-group">',
      '        <label for="gateRegUser">اسم المستخدم (بالأحرف والارقام) <span style="color:var(--color-late)">*</span></label>',
      '        <input type="text" id="gateRegUser" class="form-control" autocomplete="username" placeholder="مثال: designer1">',
      '      </div>',
      '      <div class="form-group">',
      '        <label for="gateRegEmail">البريد الإلكتروني (اختياري)</label>',
      '        <input type="email" id="gateRegEmail" class="form-control" placeholder="name@example.com">',
      '      </div>',
      '      <div class="form-group">',
      '        <label for="gateRegPass">كلمة المرور (6 أحرف على الأقل) <span style="color:var(--color-late)">*</span></label>',
      '        <input type="password" id="gateRegPass" class="form-control" autocomplete="new-password" placeholder="••••••••">',
      '      </div>',
      '      <button type="submit" class="btn btn-block" style="padding: 12px; font-size: 1rem; margin-top: 14px;" id="gateRegSubmitBtn">',
      '        <span>إنشاء حساب جديد وحفظ البيانات</span>',
      '      </button>',
      '    </form>',

      // Local Standalone PWA Section
      '    <div class="auth-gate-local-box">',
      '      <div class="local-box-icon">💻</div>',
      '      <div class="local-box-content">',
      '        <div class="local-box-title">ترغب بالعمل بدون حساب وبدون إنترنت؟</div>',
      '        <p class="local-box-desc">يمكنك تثبيت دفتر كبرنامج محلي على جهازك للعمل بدون إنترنت وبدون حساب، مع إمكانية المزامنة لاحقاً عند إنشاء حساب.</p>',
      '        <button type="button" class="btn btn-secondary btn-install-local" id="gateInstallAppBtn">',
      '          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>',
      '            <line x1="8" y1="21" x2="16" y2="21"/>',
      '            <line x1="12" y1="17" x2="12" y2="21"/>',
      '          </svg>',
      '          <span>تثبيت النسخة المحلية على الجهاز (بدون حساب)</span>',
      '        </button>',
      '        <div id="gateInstallGuide" class="install-guide-text" style="display:none;"></div>',
      '      </div>',
      '    </div>',

      '  </div>',
      '</div>'
    ].join("");

    this.container.innerHTML = html;
    this.bindEvents();
  };

  AuthGateView.prototype.bindEvents = function () {
    var self = this;
    var Auth = global.StudioAuth;
    var M = global.StudioModalView;

    var tabLogin = document.getElementById("gateTabLogin");
    var tabReg = document.getElementById("gateTabRegister");
    var formLogin = document.getElementById("gateLoginForm");
    var formReg = document.getElementById("gateRegisterForm");
    var errBox = document.getElementById("gateErrorBox");
    var installBtn = document.getElementById("gateInstallAppBtn");
    var installGuide = document.getElementById("gateInstallGuide");

    function clearInputErrors() {
      var inputs = document.querySelectorAll("#authGateContainer .form-control");
      inputs.forEach(function (inp) {
        inp.style.borderColor = "";
      });
    }

    function markInputError(inputId, msg) {
      clearInputErrors();
      var input = document.getElementById(inputId);
      if (input) {
        input.style.borderColor = "var(--color-late)";
        input.focus();
      }
      showError(msg);
    }

    function showError(msg) {
      if (errBox) {
        errBox.textContent = msg;
        errBox.style.display = "block";
      }
    }

    function hideError() {
      clearInputErrors();
      if (errBox) {
        errBox.textContent = "";
        errBox.style.display = "none";
      }
    }

    // PWA Install Button Handler
    if (installBtn) {
      installBtn.addEventListener("click", function () {
        var appInst = global.StudioAppInstance;
        if (appInst && appInst.deferredInstallPrompt) {
          appInst.deferredInstallPrompt.prompt();
          appInst.deferredInstallPrompt.userChoice.then(function (choice) {
            if (choice && choice.outcome === "accepted") {
              if (M) M.showToast("تم تثبيت التطبيق بنجاح! يمكنك الآن استخدامه محلياً.", "success");
            }
            appInst.deferredInstallPrompt = null;
          });
        } else {
          if (installGuide) {
            installGuide.innerHTML = [
              '<div class="install-guide-box">',
              '  <strong>طريقة التثبيت السريع:</strong>',
              '  <ol style="margin: 8px 16px 0 0; padding: 0; font-size: 0.84rem; line-height: 1.6;">',
              '    <li>اضغط على رمز التثبيت <strong>(⊕)</strong> في شريط عنوان المتصفح، أو من قائمة المتصفح <strong>(⋮)</strong> اختر <strong>"تثبيت التطبيق"</strong> (Install App).</li>',
              '    <li>بعد التثبيت، سيفتح التطبيق في نافذة مستقلة كبرنامج كامل يعمل بدون إنترنت وبدون حساب.</li>',
              '  </ol>',
              '</div>'
            ].join("");
            installGuide.style.display = "block";
          }
        }
      });
    }

    if (tabLogin && tabReg) {
      tabLogin.addEventListener("click", function () {
        self.activeTab = "login";
        tabLogin.classList.add("active");
        tabReg.classList.remove("active");
        if (formLogin) formLogin.style.display = "";
        if (formReg) formReg.style.display = "none";
        hideError();
      });

      tabReg.addEventListener("click", function () {
        self.activeTab = "register";
        tabReg.classList.add("active");
        tabLogin.classList.remove("active");
        if (formReg) formReg.style.display = "";
        if (formLogin) formLogin.style.display = "none";
        hideError();
      });
    }

    if (formLogin) {
      formLogin.addEventListener("submit", function (e) {
        e.preventDefault();
        hideError();
        var submitBtn = document.getElementById("gateLoginSubmitBtn");
        var u = (document.getElementById("gateLoginUser").value || "").trim();
        var p = (document.getElementById("gateLoginPass").value || "").trim();

        // Friendly Input Validation
        if (!u) {
          markInputError("gateLoginUser", "يرجى كتابة اسم المستخدم أولاً.");
          return;
        }
        if (!p) {
          markInputError("gateLoginPass", "يرجى إدخال كلمة المرور.");
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>جاري التحقق والدخول...</span>';
        }

        Auth.login(u, p)
          .then(function (res) {
            if (M) M.showToast("تم تسجيل الدخول بنجاح! جاري عرض المفكرة...", "success");
            self.checkGate();
            if (global.StudioAppInstance) {
              global.StudioAppInstance.render();
            }
          })
          .catch(function (err) {
            showError(err.message || "اسم المستخدم أو كلمة المرور غير صحيحة. يرجى المحاولة مجدداً.");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>دخول إلى دفتر ومزامنة البيانات</span>';
            }
          });
      });
    }

    if (formReg) {
      formReg.addEventListener("submit", function (e) {
        e.preventDefault();
        hideError();
        var submitBtn = document.getElementById("gateRegSubmitBtn");
        var name = (document.getElementById("gateRegName").value || "").trim();
        var u = (document.getElementById("gateRegUser").value || "").trim();
        var email = (document.getElementById("gateRegEmail").value || "").trim();
        var p = (document.getElementById("gateRegPass").value || "").trim();

        // Friendly Input Validation
        if (!u) {
          markInputError("gateRegUser", "يرجى اختيار اسم مستخدم لحسابك.");
          return;
        }
        if (u.length < 3) {
          markInputError("gateRegUser", "اسم المستخدم قصير؛ يجب أن يكون 3 أحرف أو أرقام على الأقل.");
          return;
        }
        if (/\s/.test(u) || !/^[a-zA-Z0-9_-]+$/.test(u)) {
          markInputError("gateRegUser", "اسم المستخدم يجب أن يكون بأحرف أو أرقام إنجليزية بدون مسافات.");
          return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          markInputError("gateRegEmail", "يرجى التأكد من كتابة البريد الإلكتروني بشكل صحيح (مثال: name@example.com).");
          return;
        }
        if (!p) {
          markInputError("gateRegPass", "يرجى كتابة كلمة مرور لحماية حسابك.");
          return;
        }
        if (p.length < 6) {
          markInputError("gateRegPass", "كلمة المرور يجب ألا تقل عن 6 خانات أو أحرف.");
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>جاري إنشاء الحساب ونقل البيانات...</span>';
        }

        Auth.register(u, p, name, email)
          .then(function (res) {
            if (M) M.showToast("تم إنشاء حسابك وحفظ بياناتك بنجاح!", "success");
            self.checkGate();
            if (global.StudioAppInstance) {
              global.StudioAppInstance.render();
            }
          })
          .catch(function (err) {
            showError(err.message || "تعذر إنشاء الحساب؛ قد يكون اسم المستخدم مسجلاً مسبقاً.");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>إنشاء حساب جديد وحفظ البيانات</span>';
            }
          });
      });
    }
  };

  global.StudioAuthGate = new AuthGateView();

})(window);
