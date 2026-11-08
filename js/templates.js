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

  var DEFAULT_CATEGORIES = [
    { id: "task", label: "مهمة عامة", color: "#1f6355", colorClass: "tag-task", isDefault: true },
    { id: "appt", label: "قياسات وموعد", color: "#2563eb", colorClass: "tag-appt", isDefault: true },
    { id: "design", label: "تجهيز التصميم", color: "#0284c7", colorClass: "tag-design", isDefault: true },
    { id: "invoice", label: "الفواتير", color: "#16a34a", colorClass: "tag-invoice", isDefault: true },
    { id: "approval", label: "موافقات وحجز مواد", color: "#d97706", colorClass: "tag-approval", isDefault: true },
    { id: "exec", label: "تصاميم تنفيذية", color: "#7c3aed", colorClass: "tag-exec", isDefault: true },
    { id: "contact", label: "تواصل", color: "#0d9488", colorClass: "tag-contact", isDefault: true },
    { id: "delivery", label: "تسليم وتشطيب", color: "#b45309", colorClass: "tag-delivery", isDefault: true }
  ];

  var CATEGORY_COLORS = [
    { name: "أخضر استوديو", hex: "#1f6355" },
    { name: "أزرق ملكي", hex: "#2563eb" },
    { name: "سماوي حديث", hex: "#0284c7" },
    { name: "زمردي هادئ", hex: "#16a34a" },
    { name: "كهرماني دافئ", hex: "#d97706" },
    { name: "نحاسي فاخر", hex: "#966a24" },
    { name: "بنفسجي إبداعي", hex: "#7c3aed" },
    { name: "وردي توتي", hex: "#e11d48" },
    { name: "مرجاني حيوي", hex: "#ea580c" },
    { name: "رمادي داكن", hex: "#475569" }
  ];

  var KINDS = {
    all: { label: "الكل", colorClass: "", color: "#1f6355" },
    task: { label: "مهمة عامة", colorClass: "tag-task", color: "#1f6355" },
    appt: { label: "قياسات وموعد", colorClass: "tag-appt", color: "#2563eb" },
    design: { label: "تجهيز التصميم", colorClass: "tag-design", color: "#0284c7" },
    invoice: { label: "الفواتير", colorClass: "tag-invoice", color: "#16a34a" },
    approval: { label: "موافقات وحجز مواد", colorClass: "tag-approval", color: "#d97706" },
    exec: { label: "تصاميم تنفيذية", colorClass: "tag-exec", color: "#7c3aed" },
    contact: { label: "تواصل", colorClass: "tag-contact", color: "#0d9488" },
    delivery: { label: "تسليم وتشطيب", colorClass: "tag-delivery", color: "#b45309" }
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
      ],
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
    };
  }

  global.StudioTemplates = {
    PHASES: PHASES,
    KINDS: KINDS,
    DEFAULT_CATEGORIES: DEFAULT_CATEGORIES,
    CATEGORY_COLORS: CATEGORY_COLORS,
    PROJECT_TASK_TEMPLATES: PROJECT_TASK_TEMPLATES,
    getInitialSeedData: getInitialSeedData
  };
})(window);
