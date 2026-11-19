/**
 * Studio Planner - Change Log / Audit Trail Dialog
 * Uses native <dialog> matching the Studio Deep Emerald / Sage theme tokens.
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  function openChangeLogModal() {
    var auth = global.StudioAuth;
    if (!auth || !auth.isLoggedIn()) {
      if (global.StudioModalView && global.StudioModalView.showToast) {
        global.StudioModalView.showToast("يرجى تسجيل الدخول أولاً لعرض سجل العمليات.", "info");
      }
      if (global.StudioAuthModal) {
        global.StudioAuthModal.openAuthModal(true);
      }
      return;
    }

    var existingDialog = document.getElementById("changeLogDialog");
    if (existingDialog) {
      existingDialog.close();
      existingDialog.remove();
    }

    var dialogHtml = [
      '<dialog class="dialog-large" id="changeLogDialog" aria-labelledby="changeLogDialogTitle">',
      '  <div class="modal-header">',
      '    <h3 id="changeLogDialogTitle" style="display:flex; align-items:center; gap:8px;">',
      '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      '      <span>سجل التغييرات الشامل (Audit Log)</span>',
      '    </h3>',
      '    <button class="btn-icon" id="closeChangeLogDialogBtn" aria-label="إغلاق">✕</button>',
      '  </div>',
      '  <div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 14px 0; align-items: center;">',
      '    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem;">',
      '      <label for="logSourceFilter">المصدر:</label>',
      '      <select id="logSourceFilter" class="form-control" style="padding: 4px 8px; height: 34px;">',
      '        <option value="">كافة المصادر (Online & Offline)</option>',
      '        <option value="offline">المعدل أوفلاين فقط (Offline)</option>',
      '        <option value="online">المعدل أونلاين فقط (Online)</option>',
      '      </select>',
      '    </div>',
      '    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem;">',
      '      <label for="logStatusFilter">الحالة:</label>',
      '      <select id="logStatusFilter" class="form-control" style="padding: 4px 8px; height: 34px;">',
      '        <option value="">كافة الحالات</option>',
      '        <option value="applied">تم التطبيق (Applied)</option>',
      '        <option value="conflict">تعارض (Conflict)</option>',
      '        <option value="resolved">تم الحسم (Resolved)</option>',
      '      </select>',
      '    </div>',
      '    <button class="btn btn-secondary btn-sm" id="refreshLogBtn">🔄 تحديث</button>',
      '  </div>',
      '  <div style="margin: 12px 0; max-height: 55vh; overflow-y: auto;" id="changeLogContentArea">',
      '    <div style="text-align:center; padding: 20px; color: var(--ink-secondary);">جاري جلب السجل الزمني...</div>',
      '  </div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="cancelChangeLogDialogBtn">إغلاق</button>',
      '  </div>',
      '</dialog>'
    ].join("");

    document.body.insertAdjacentHTML("beforeend", dialogHtml);
    var dialog = document.getElementById("changeLogDialog");

    var closeDialog = function () {
      if (dialog) {
        dialog.close();
        dialog.remove();
      }
    };

    document.getElementById("closeChangeLogDialogBtn").addEventListener("click", closeDialog);
    document.getElementById("cancelChangeLogDialogBtn").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeDialog();
    });

    var sourceFilter = document.getElementById("logSourceFilter");
    var statusFilter = document.getElementById("logStatusFilter");
    var refreshBtn = document.getElementById("refreshLogBtn");
    var contentArea = document.getElementById("changeLogContentArea");

    var loadLogs = function () {
      contentArea.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--ink-secondary);">جاري جلب السجل الزمني...</div>';
      var params = [];
      if (sourceFilter.value) params.push("source=" + encodeURIComponent(sourceFilter.value));
      if (statusFilter.value) params.push("status=" + encodeURIComponent(statusFilter.value));
      var query = params.length > 0 ? "?" + params.join("&") : "";

      fetch("/api/change_log" + query, {
        headers: { "Authorization": "Bearer " + auth.getToken() }
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.success) {
            contentArea.innerHTML = '<div style="color:var(--color-late); padding: 16px; text-align: center;">' + U.escapeHtml(data.error || "فشل تحميل السجل") + '</div>';
            return;
          }

          var logs = data.logs || [];
          var metrics = data.metrics || { total: 0, online: 0, offline: 0, conflict: 0 };

          var metricsHtml = [
            '<div class="log-metrics-summary">',
            '  <span class="metric-pill">إجمالي العمليات: <strong>' + metrics.total + '</strong></span>',
            '  <span class="metric-pill online-pill">أونلاين 🟢: <strong>' + metrics.online + '</strong></span>',
            '  <span class="metric-pill offline-pill">أوفلاين 🟠: <strong>' + metrics.offline + '</strong></span>',
            (metrics.conflict > 0 ? '  <span class="metric-pill conflict-pill">تعارضات ⚠️: <strong>' + metrics.conflict + '</strong></span>' : ''),
            '</div>'
          ].join("");

          if (logs.length === 0) {
            contentArea.innerHTML = metricsHtml + '<div class="empty-state" style="padding: 20px 0;"><p>لا توجد حركات مسجلة مطابقة للشروط.</p></div>';
            return;
          }

          var rowsHtml = logs.map(function (log) {
            var entityAr = "عنصر";
            if (log.entity_type === "item") entityAr = "مهمة";
            else if (log.entity_type === "project") entityAr = "مشروع";
            else if (log.entity_type === "client") entityAr = "عميل";
            else if (log.entity_type === "category") entityAr = "قسم";
            else if (log.entity_type === "setting") entityAr = "إعداد";

            var actionAr = "تعديل";
            if (log.action === "create") actionAr = "إضافة جديدة";
            else if (log.action === "delete") actionAr = "حذف";

            var sourceClass = log.source === "offline" ? "source-offline" : "source-online";
            var statusClass = "status-" + log.status;

            var timeStr = log.client_timestamp ? new Date(log.client_timestamp).toLocaleString("ar-EG") : (log.server_timestamp || "—");

            var payloadPreview = "";
            if (log.payload) {
              var p = log.payload;
              var name = p.title || p.name || p.label || p.value || "";
              if (name) payloadPreview = ' — <span style="font-weight:600;">"' + U.escapeHtml(name) + '"</span>';
            }

            return [
              '<tr>',
              '  <td style="color:var(--ink-muted); font-size:0.75rem;">#' + log.id + '</td>',
              '  <td style="white-space:nowrap; color:var(--ink-secondary); font-size:0.8rem;">' + timeStr + '</td>',
              '  <td><span class="source-tag ' + sourceClass + '">' + (log.source === "offline" ? "أوفلاين 🟠" : "أونلاين 🟢") + '</span></td>',
              '  <td style="font-weight:600;">' + entityAr + '</td>',
              '  <td><strong>' + actionAr + '</strong>' + payloadPreview + '</td>',
              '  <td><span class="status-tag ' + statusClass + '">' + log.status + '</span></td>',
              '</tr>'
            ].join("");
          }).join("");

          contentArea.innerHTML = metricsHtml + [
            '<div class="log-table-wrapper">',
            '  <table class="log-table">',
            '    <thead>',
            '      <tr>',
            '        <th>#</th>',
            '        <th>التوقيت</th>',
            '        <th>المصدر</th>',
            '        <th>النوع</th>',
            '        <th>الإجراء والتفاصيل</th>',
            '        <th>الحالة</th>',
            '      </tr>',
            '    </thead>',
            '    <tbody>',
            rowsHtml,
            '    </tbody>',
            '  </table>',
            '</div>'
          ].join("");
        })
        .catch(function (err) {
          contentArea.innerHTML = '<div style="color:var(--color-late); padding: 16px; text-align: center;">فشل جلب البيانات: ' + U.escapeHtml(err.message) + '</div>';
        });
    };

    sourceFilter.addEventListener("change", loadLogs);
    statusFilter.addEventListener("change", loadLogs);
    refreshBtn.addEventListener("click", loadLogs);

    loadLogs();
    dialog.showModal();
  }

  global.StudioChangeLogModal = {
    openChangeLogModal: openChangeLogModal
  };
})(window);
