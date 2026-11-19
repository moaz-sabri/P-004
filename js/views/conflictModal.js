/**
 * Studio Planner - Conflict Review & Resolution Dialog
 * Uses native <dialog> matching the Studio Deep Emerald / Sage theme tokens.
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  function renderConflictCard(conflict) {
    var cId = conflict.conflict_id;
    var entityType = conflict.entity_type;
    var entityId = conflict.entity_id;
    var msg = conflict.message || "تعارض في المزامنة";
    var clientPayload = conflict.client_payload || {};
    var serverPayload = conflict.server_payload || {};

    var entityLabel = "عنصر";
    if (entityType === "item") entityLabel = "مهمة / موعد";
    else if (entityType === "project") entityLabel = "مشروع";
    else if (entityType === "client") entityLabel = "عميل";

    var title = clientPayload.title || clientPayload.name || serverPayload.title || serverPayload.name || entityId;
    var clientDateStr = conflict.client_timestamp ? new Date(conflict.client_timestamp).toLocaleString("ar-EG") : "أوفلاين";
    var serverStatusStr = serverPayload.is_deleted ? "محذوف على الخادم" : "معدل على الخادم";

    return [
      '<div class="conflict-item-card" data-conflict-id="' + cId + '">',
      '  <div class="conflict-card-header">',
      '    <div class="conflict-badge">⚠️ تعارض في ' + entityLabel + '</div>',
      '    <h4 class="conflict-item-title">' + U.escapeHtml(title) + '</h4>',
      '    <p class="conflict-msg-text">' + U.escapeHtml(msg) + '</p>',
      '  </div>',
      '  <div class="conflict-comparison-grid">',
      '    <div class="conflict-side client-side">',
      '      <div class="side-badge offline-badge">النسخة المحلية (Offline)</div>',
      '      <div class="side-meta">توقيت التعديل: ' + clientDateStr + '</div>',
      '      <div class="side-data">',
      '        <div class="data-row"><strong>العنوان/الاسم:</strong> ' + U.escapeHtml(clientPayload.title || clientPayload.name || "—") + '</div>',
      (clientPayload.date ? '        <div class="data-row"><strong>التاريخ:</strong> ' + U.escapeHtml(clientPayload.date) + '</div>' : ''),
      (clientPayload.time ? '        <div class="data-row"><strong>الوقت:</strong> ' + U.escapeHtml(clientPayload.time) + '</div>' : ''),
      (clientPayload.done !== undefined ? '        <div class="data-row"><strong>الحالة:</strong> ' + (clientPayload.done ? "مكتمل" : "غير مكتمل") + '</div>' : ''),
      '      </div>',
      '    </div>',
      '    <div class="conflict-side server-side">',
      '      <div class="side-badge online-badge">حالة الخادم (Server)</div>',
      '      <div class="side-meta">الحالة: ' + serverStatusStr + '</div>',
      '      <div class="side-data">',
      (serverPayload.is_deleted
        ? '        <div class="data-row" style="color:var(--color-late);">العنصر تم حذفه مسبقاً من قاعدة البيانات.</div>'
        : '        <div class="data-row"><strong>العنوان/الاسم:</strong> ' + U.escapeHtml(serverPayload.title || serverPayload.name || "—") + '</div>' +
          (serverPayload.date ? '        <div class="data-row"><strong>التاريخ:</strong> ' + U.escapeHtml(serverPayload.date) + '</div>' : '') +
          (serverPayload.done !== undefined ? '        <div class="data-row"><strong>الحالة:</strong> ' + (serverPayload.done ? "مكتمل" : "غير مكتمل") + '</div>' : '')
      ),
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="conflict-actions-bar">',
      '    <span class="actions-label">حسم النتيجة:</span>',
      '    <button class="btn-resolve btn-keep-local" data-action="resolve-keep-local" data-conflict-id="' + cId + '" data-entity-type="' + entityType + '" data-entity-id="' + entityId + '">',
      '      <span>✓ اعتماد التعديل المحلي</span>',
      '    </button>',
      '    <button class="btn-resolve btn-keep-server" data-action="resolve-keep-server" data-conflict-id="' + cId + '" data-entity-type="' + entityType + '" data-entity-id="' + entityId + '">',
      '      <span>✓ اعتماد الخادم</span>',
      '    </button>',
      '    <button class="btn-resolve btn-keep-both" data-action="resolve-keep-both" data-conflict-id="' + cId + '" data-entity-type="' + entityType + '" data-entity-id="' + entityId + '">',
      '      <span>+ الاحتفاظ بالاثنين كنسخة إضافية</span>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderConflictModalContent(conflicts) {
    if (!conflicts || conflicts.length === 0) {
      return [
        '<div class="empty-state" style="padding: 24px 0;">',
        '  <div style="font-size: 2rem; color: var(--color-success); margin-bottom: 8px;">✓</div>',
        '  <h4 style="font-size: 1.1rem; color: var(--ink-primary); margin-bottom: 4px;">لا توجد أي تعارضات معلقة</h4>',
        '  <p style="color: var(--ink-secondary); font-size: 0.9rem;">كافة البيانات المحلية متزامنة ومطابقة تماماً لقاعدة البيانات.</p>',
        '</div>'
      ].join("");
    }

    return [
      '<div class="conflict-modal-body">',
      '  <div class="online-auth-notice" style="margin-bottom: 16px;">',
      '    <div class="online-auth-notice-text">',
      '      تم رصد <strong>' + conflicts.length + '</strong> حالة تعديل غير متطابقة تمت في وضع عدم الاتصال (Offline). يرجى مراجعة التفاصيل أدناه وحسم القرار.',
      '    </div>',
      '  </div>',
      '  <div class="conflict-list-container">',
      conflicts.map(renderConflictCard).join(""),
      '  </div>',
      '</div>'
    ].join("");
  }

  function openConflictModal() {
    var sync = global.StudioSync;
    var conflicts = sync ? sync.conflicts : [];

    var existingDialog = document.getElementById("conflictDialog");
    if (existingDialog) {
      existingDialog.close();
      existingDialog.remove();
    }

    var dialogHtml = [
      '<dialog class="dialog-large" id="conflictDialog" aria-labelledby="conflictDialogTitle">',
      '  <div class="modal-header">',
      '    <h3 id="conflictDialogTitle" style="display:flex; align-items:center; gap:8px;">',
      '      <span style="color:var(--color-late);">⚠️</span>',
      '      <span>تقرير مراجعة تعارضات المزامنة</span>',
      '    </h3>',
      '    <button class="btn-icon" id="closeConflictDialogBtn" aria-label="إغلاق">✕</button>',
      '  </div>',
      '  <div style="margin: 16px 0; max-height: 65vh; overflow-y: auto;" id="conflictDialogScrollArea">',
      renderConflictModalContent(conflicts),
      '  </div>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-secondary" id="cancelConflictDialogBtn">إغلاق</button>',
      '  </div>',
      '</dialog>'
    ].join("");

    document.body.insertAdjacentHTML("beforeend", dialogHtml);
    var dialog = document.getElementById("conflictDialog");

    var closeDialog = function () {
      if (dialog) {
        dialog.close();
        dialog.remove();
      }
    };

    document.getElementById("closeConflictDialogBtn").addEventListener("click", closeDialog);
    document.getElementById("cancelConflictDialogBtn").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeDialog();
    });

    dialog.addEventListener("click", function (e) {
      var btn = e.target.closest(".btn-resolve");
      if (!btn) return;

      var action = btn.dataset.action;
      var cId = parseInt(btn.dataset.conflictId, 10);
      var eType = btn.dataset.entityType;
      var eId = btn.dataset.entityId;

      var foundConflict = conflicts.find(function (c) { return c.conflict_id === cId; });
      var payload = foundConflict ? (foundConflict.client_payload || {}) : {};

      var resolution = "keep_server";
      if (action === "resolve-keep-local") resolution = "keep_local";
      else if (action === "resolve-keep-both") resolution = "keep_both";

      btn.disabled = true;
      btn.textContent = "جاري الحسم...";

      sync.resolveConflict(cId, resolution, eType, eId, payload)
        .then(function () {
          var card = btn.closest(".conflict-item-card");
          if (card) {
            card.style.opacity = "0.5";
            card.innerHTML = '<div class="conflict-resolved-msg">✓ تم حسم التعارض بنجاح (' + (resolution === "keep_local" ? "اعتماد المحلي" : (resolution === "keep_both" ? "حفظ كنسخة" : "اعتماد الخادم")) + ')</div>';
            setTimeout(function () {
              card.remove();
              if (sync.conflicts.length === 0) {
                closeDialog();
              }
            }, 700);
          }
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = "حدث خطأ";
          alert(err.message || "فشل حسم التعارض");
        });
    });

    dialog.showModal();
  }

  global.StudioConflictModal = {
    openConflictModal: openConflictModal,
    renderConflictModalContent: renderConflictModalContent
  };
})(window);
