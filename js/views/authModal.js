/**
 * Studio Planner - Auth Dialog (Login, Register & User Account)
 * Uses native <dialog> matching the Studio Deep Emerald / Sage theme tokens.
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  function openAuthModal(showOnlineNotice) {
    var auth = global.StudioAuth;
    var sync = global.StudioSync;
    var user = auth ? auth.getUser() : null;
    var isLoggedIn = auth ? auth.isLoggedIn() : false;

    var existingDialog = document.getElementById("authDialog");
    if (existingDialog) {
      existingDialog.close();
      existingDialog.remove();
    }

    var noticeHtml = "";
    if (showOnlineNotice || (sync && sync.isOnline && !isLoggedIn)) {
      noticeHtml = [
        '<div class="online-auth-notice" style="margin-bottom: 16px;">',
        '  <div class="online-auth-notice-text">',
        '    <strong>⚠️ يلزم تسجيل الدخول للعمل أونلاين:</strong>',
        '    <span>المزامنة السحابية وقاعدة بيانات MySQL تتطلب حساباً معتمداً. العمل بدون حساب متاح فقط في الوضع المحلي (أوفلاين). أي بيانات أنشأتها محلياً ستُنقل وتُنسب لحسابك فور تسجيل الدخول.</span>',
        '  </div>',
        '</div>'
      ].join("");
    }

    var contentHtml = "";

    if (isLoggedIn && user) {
      contentHtml = [
        '<div class="auth-profile-box">',
        '  <div class="user-avatar-circle">' + U.escapeHtml((user.name || user.username || "U")[0].toUpperCase()) + '</div>',
        '  <h4 class="user-profile-name">' + U.escapeHtml(user.name || user.username) + '</h4>',
        '  <div class="user-profile-meta">',
        '    <span class="user-role-badge">' + (user.role === "admin" ? "مدير النظام" : "مستخدم مسجل") + '</span>',
        '    <span class="user-username-badge">@' + U.escapeHtml(user.username) + '</span>',
        '  </div>',
        (user.email ? '  <p style="color:var(--ink-secondary); font-size:0.85rem; margin-bottom:12px;">' + U.escapeHtml(user.email) + '</p>' : ''),
        '  <div class="auth-sync-status-card">',
        '    <div class="status-indicator-line">',
        '      <span class="status-bullet ' + (sync && sync.isOnline ? "online" : "offline") + '"></span>',
        '      <span>الحالة: ' + (sync && sync.isOnline ? "متصل بقاعدة البيانات MySQL 🟢" : "وضع عدم الاتصال (Offline) 🟠") + '</span>',
        '    </div>',
        '    <div style="font-size:0.82rem; color:var(--ink-secondary);">الحركات المحلية المسجلة: <strong>' + (sync ? sync.queue.length : 0) + '</strong></div>',
        '  </div>',
        '  <div class="auth-profile-actions">',
        '    <button class="btn btn-secondary btn-sm" id="authSyncNowBtn">🔄 مزامنة فورية</button>',
        '    <button class="btn btn-secondary btn-sm" id="authLogoutBtn" style="color:var(--color-late);">تسجيل الخروج</button>',
        '  </div>',
        '</div>'
      ].join("");
    } else {
      contentHtml = [
        noticeHtml,
        '<div class="auth-tabs" role="tablist">',
        '  <button class="auth-tab-btn active" id="tabLoginBtn" role="tab" aria-selected="true">تسجيل الدخول</button>',
        '  <button class="auth-tab-btn" id="tabRegisterBtn" role="tab" aria-selected="false">إنشاء حساب جديد</button>',
        '</div>',
        '<div class="auth-form-container">',
        '  <!-- Login Form -->',
        '  <form id="authLoginForm" class="auth-form">',
        '    <div class="form-group">',
        '      <label for="loginUsername">اسم المستخدم</label>',
        '      <input type="text" id="loginUsername" class="form-control" required autocomplete="username" placeholder="مثال: admin">',
        '    </div>',
        '    <div class="form-group">',
        '      <label for="loginPassword">كلمة المرور</label>',
        '      <input type="password" id="loginPassword" class="form-control" required autocomplete="current-password" placeholder="••••••••">',
        '    </div>',
        '    <div class="auth-error-msg" id="loginErrorMsg" style="display:none;"></div>',
        '    <button type="submit" class="btn btn-primary btn-block" id="loginSubmitBtn">دخول ومزامنة البيانات</button>',
        '    <p class="auth-hint">حساب النظام الافتراضي: <strong>admin</strong> / كلمة المرور: <strong>admin123</strong></p>',
        '  </form>',
        '  <!-- Register Form -->',
        '  <form id="authRegisterForm" class="auth-form" style="display:none;">',
        '    <div class="form-group">',
        '      <label for="regName">الاسم الكامل</label>',
        '      <input type="text" id="regName" class="form-control" placeholder="اسمك أو اسم الاستوديو">',
        '    </div>',
        '    <div class="form-group">',
        '      <label for="regUsername">اسم المستخدم</label>',
        '      <input type="text" id="regUsername" class="form-control" required autocomplete="username" placeholder="أحرف وأرقام إنجليزية">',
        '    </div>',
        '    <div class="form-group">',
        '      <label for="regEmail">البريد الإلكتروني (اختياري)</label>',
        '      <input type="email" id="regEmail" class="form-control" placeholder="name@example.com">',
        '    </div>',
        '    <div class="form-group">',
        '      <label for="regPassword">كلمة المرور</label>',
        '      <input type="password" id="regPassword" class="form-control" required autocomplete="new-password" placeholder="6 أحرف على الأقل">',
        '    </div>',
        '    <div class="auth-error-msg" id="regErrorMsg" style="display:none;"></div>',
        '    <button type="submit" class="btn btn-primary btn-block" id="regSubmitBtn">إنشاء حساب ونسب بياناتك له</button>',
        '  </form>',
        '</div>'
      ].join("");
    }

    var dialogHtml = [
      '<dialog class="dialog-medium" id="authDialog" aria-labelledby="authDialogTitle">',
      '  <div class="modal-header">',
      '    <h3 id="authDialogTitle">' + (isLoggedIn ? "الملف الشخصي والحساب" : "تسجيل الدخول لنظام الاستوديو") + '</h3>',
      '    <button class="btn-icon" id="closeAuthDialogBtn" aria-label="إغلاق">✕</button>',
      '  </div>',
      '  <div style="margin: 16px 0;">',
      contentHtml,
      '  </div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="cancelAuthDialogBtn">إغلاق</button>',
      '  </div>',
      '</dialog>'
    ].join("");

    document.body.insertAdjacentHTML("beforeend", dialogHtml);
    var dialog = document.getElementById("authDialog");

    var closeDialog = function () {
      if (dialog) {
        dialog.close();
        dialog.remove();
      }
    };

    document.getElementById("closeAuthDialogBtn").addEventListener("click", closeDialog);
    document.getElementById("cancelAuthDialogBtn").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeDialog();
    });

    if (isLoggedIn) {
      var logoutBtn = document.getElementById("authLogoutBtn");
      var syncNowBtn = document.getElementById("authSyncNowBtn");

      if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
          auth.logout();
          closeDialog();
          location.reload();
        });
      }
      if (syncNowBtn) {
        syncNowBtn.addEventListener("click", function () {
          syncNowBtn.disabled = true;
          syncNowBtn.textContent = "جاري المزامنة...";
          if (sync) {
            sync.sync().then(function () {
              syncNowBtn.textContent = "✓ تمت المزامنة";
              setTimeout(function () { closeDialog(); }, 500);
            }).catch(function (err) {
              syncNowBtn.disabled = false;
              syncNowBtn.textContent = "فشل الاتصال";
            });
          }
        });
      }
    } else {
      var tabLoginBtn = document.getElementById("tabLoginBtn");
      var tabRegisterBtn = document.getElementById("tabRegisterBtn");
      var loginForm = document.getElementById("authLoginForm");
      var regForm = document.getElementById("authRegisterForm");
      var loginError = document.getElementById("loginErrorMsg");
      var regError = document.getElementById("regErrorMsg");

      tabLoginBtn.addEventListener("click", function () {
        tabLoginBtn.classList.add("active");
        tabRegisterBtn.classList.remove("active");
        loginForm.style.display = "block";
        regForm.style.display = "none";
      });

      tabRegisterBtn.addEventListener("click", function () {
        tabRegisterBtn.classList.add("active");
        tabLoginBtn.classList.remove("active");
        regForm.style.display = "block";
        loginForm.style.display = "none";
      });

      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var u = document.getElementById("loginUsername").value.trim();
        var p = document.getElementById("loginPassword").value;
        var btn = document.getElementById("loginSubmitBtn");
        btn.disabled = true;
        btn.textContent = "جاري تسجيل الدخول ونسب البيانات...";
        loginError.style.display = "none";

        auth.login(u, p)
          .then(function () {
            btn.textContent = "✓ تم بنجاح";
            setTimeout(function () {
              closeDialog();
              location.reload();
            }, 400);
          })
          .catch(function (err) {
            btn.disabled = false;
            btn.textContent = "دخول ومزامنة البيانات";
            loginError.textContent = err.message || "فشل تسجيل الدخول";
            loginError.style.display = "block";
          });
      });

      regForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = document.getElementById("regName").value.trim();
        var u = document.getElementById("regUsername").value.trim();
        var email = document.getElementById("regEmail").value.trim();
        var p = document.getElementById("regPassword").value;
        var btn = document.getElementById("regSubmitBtn");
        btn.disabled = true;
        btn.textContent = "جاري إنشاء الحساب وربط البيانات...";
        regError.style.display = "none";

        auth.register(u, p, name, email)
          .then(function () {
            btn.textContent = "✓ تم إنشاء الحساب ونسب بياناتك له بنجاح";
            setTimeout(function () {
              closeDialog();
              location.reload();
            }, 400);
          })
          .catch(function (err) {
            btn.disabled = false;
            btn.textContent = "إنشاء حساب ونسب بياناتك له";
            regError.textContent = err.message || "فشل إنشاء الحساب";
            regError.style.display = "block";
          });
      });
    }

    dialog.showModal();
  }

  global.StudioAuthModal = {
    openAuthModal: openAuthModal
  };
})(window);
