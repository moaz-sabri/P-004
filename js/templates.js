/**
 * Project Phases, Task Types, and Default Templates (100% Local)
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils || {};

  var PHASES = [
    { id: 0, key: "design", label: "تصميم" },
    { id: 1, key: "approval", label: "موافقة العميل" },
    { id: 2, key: "exec", label: "تنفيذ" },
    { id: 3, key: "delivery", label: "تسليم" }
  ];

  var KINDS = {
    all: { label: "الكل", colorClass: "" },
    task: { label: "مهمة عامة", colorClass: "tag-task" },
    appt: { label: "قياسات وموعد", colorClass: "tag-appt" },
    design: { label: "تجهيز التصميم", colorClass: "tag-design" },
    invoice: { label: "الفواتير", colorClass: "tag-invoice" },
    approval: { label: "موافقات وحجز مواد", colorClass: "tag-approval" },
    exec: { label: "تصاميم تنفيذية", colorClass: "tag-exec" },
    contact: { label: "تواصل", colorClass: "tag-contact" },
    delivery: { label: "تسليم وتشطيب", colorClass: "tag-delivery" }
  };

  var PROJECT_TASK_TEMPLATES = [
    ["appt", "موعد القياسات في الموقع", 0.08],
    ["design", "تجهيز المود بورد والتصميم المبدئي", 0.25],
    ["invoice", "إعداد الدفعة الأولى والفواتير", 0.35],
    ["approval", "موافقات العميل النهائية وحجز المواد", 0.48],
    ["exec", "تجهيز المخططات والتصاميم التنفيذية", 0.65],
    ["contact", "التواصل مع الموردين ومتابعة التوريد", 0.78]
  ];

  function getInitialSeedData() {
    var generateId = U.generateId || function () { return Math.random().toString(36).slice(2, 9); };
    var getTodayIso = U.getTodayIso || function () { return new Date().toISOString().slice(0, 10); };
    var addDaysIso = U.addDaysIso || function (n) {
      var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
    };

    var p1 = generateId();
    var p2 = generateId();
    var today = getTodayIso();

    return {
      version: 2,
      theme: "auto",
      projects: [
        {
          id: p1,
          name: "شقة الياسمين",
          client: "أم خالد",
          phase: 0,
          due: addDaysIso(21, today)
        },
        {
          id: p2,
          name: "مكتب شركة النخيل",
          client: "م. سامر",
          phase: 2,
          due: addDaysIso(6, today)
        }
      ],
      items: [
        {
          id: generateId(),
          title: "زيارة الموقع وأخذ القياسات",
          kind: "appt",
          date: today,
          time: "11:00",
          pid: p1,
          who: "أم خالد",
          phone: "+966501234567",
          done: false
        },
        {
          id: generateId(),
          title: "تجهيز المود بورد للعميل",
          kind: "task",
          date: addDaysIso(1, today),
          time: "",
          pid: p1,
          who: "",
          phone: "",
          done: false
        },
        {
          id: generateId(),
          title: "متابعة توريد الإضاءة",
          kind: "task",
          date: addDaysIso(-1, today),
          time: "",
          pid: p2,
          who: "شركة النور للمقاولات",
          phone: "",
          done: false
        }
      ]
    };
  }

  global.StudioTemplates = {
    PHASES: PHASES,
    KINDS: KINDS,
    PROJECT_TASK_TEMPLATES: PROJECT_TASK_TEMPLATES,
    getInitialSeedData: getInitialSeedData
  };
})(window);
