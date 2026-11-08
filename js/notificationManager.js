/**
 * Notification & Alert Manager (100% Local & Offline Audio Chime)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils;

  function NotificationManager() {
    this.audioCtx = null;
    this.checkIntervalId = null;
    this.alertedTaskIds = {};
    this._loadAlertedIds();
  }

  NotificationManager.prototype._loadAlertedIds = function () {
    try {
      var saved = sessionStorage.getItem("studio_alerted_tasks");
      if (saved) {
        var arr = JSON.parse(saved);
        for (var i = 0; i < arr.length; i++) {
          this.alertedTaskIds[arr[i]] = true;
        }
      }
    } catch (e) {}
  };

  NotificationManager.prototype._saveAlertedId = function (id) {
    this.alertedTaskIds[id] = true;
    try {
      var list = Object.keys(this.alertedTaskIds);
      sessionStorage.setItem("studio_alerted_tasks", JSON.stringify(list));
    } catch (e) {}
  };

  NotificationManager.prototype.playChime = function () {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      var now = this.audioCtx.currentTime;

      // Primary tone: D5 (587.33 Hz) -> A5 (880 Hz)
      var osc1 = this.audioCtx.createOscillator();
      var gain1 = this.audioCtx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.22, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 1.25);

      // Subtle harmonic: E6 (1318.5 Hz)
      var osc2 = this.audioCtx.createOscillator();
      var gain2 = this.audioCtx.createGain();

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1318.5, now + 0.1);

      gain2.gain.setValueAtTime(0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);

      osc2.start(now + 0.1);
      osc2.stop(now + 0.95);
    } catch (e) {
      console.warn("Audio chime could not play:", e);
    }
  };

  NotificationManager.prototype.isSupported = function () {
    return "Notification" in window;
  };

  NotificationManager.prototype.getPermission = function () {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  };

  NotificationManager.prototype.requestPermission = function (callback) {
    if (!this.isSupported()) {
      if (callback) callback(false);
      return;
    }
    Notification.requestPermission().then(function (permission) {
      if (callback) callback(permission === "granted");
    }).catch(function () {
      if (callback) callback(false);
    });
  };

  NotificationManager.prototype.sendNotification = function (title, options) {
    this.playChime();

    if (!this.isSupported() || Notification.permission !== "granted") {
      return null;
    }

    var defaultOptions = {
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      dir: "rtl",
      lang: "ar",
      tag: "studio-alert",
      renotify: true
    };

    var finalOptions = {};
    for (var k in defaultOptions) finalOptions[k] = defaultOptions[k];
    if (options) {
      for (var opt in options) finalOptions[opt] = options[opt];
    }

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification(title, finalOptions);
      });
      return true;
    }

    try {
      return new Notification(title, finalOptions);
    } catch (e) {
      return null;
    }
  };

  NotificationManager.prototype.startScheduler = function () {
    this.checkDueTasks();

    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }
    var self = this;
    this.checkIntervalId = setInterval(function () {
      self.checkDueTasks();
    }, 60000);
  };

  NotificationManager.prototype.checkDueTasks = function () {
    var S = global.StudioStore;
    if (!S) return;

    var today = U.getTodayIso();
    var now = new Date();
    var currentHours = String(now.getHours()).padStart(2, "0");
    var currentMinutes = String(now.getMinutes()).padStart(2, "0");
    var currentTimeStr = currentHours + ":" + currentMinutes;

    var items = S.getItems().filter(function (i) { return !i.done && i.date === today; });

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (this.alertedTaskIds[item.id]) continue;

      if (item.time && item.time <= currentTimeStr) {
        var proj = S.getProject(item.pid);
        var projName = proj ? " · مشروع: " + proj.name : "";
        var who = item.who ? " (مع " + item.who + ")" : "";

        this.sendNotification("⏰ موعد مجدول: " + item.title, {
          body: "الوقت: " + item.time + who + projName,
          tag: "task-" + item.id
        });

        this._saveAlertedId(item.id);
      }
    }
  };

  NotificationManager.prototype.testNotification = function () {
    this.sendNotification("🔔 إشعار محلي من مفكرة الاستوديو", {
      body: "نظام التنبيهات ونغمات الاستوديو يعمل محلياً بنجاح 100%!",
      tag: "test-alert"
    });
  };

  global.StudioNotifications = new NotificationManager();
})(window);
