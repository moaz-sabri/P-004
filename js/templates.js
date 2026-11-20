
/**
 * Project Phases, Task Types, and Default Templates (100% Local)
 * Generic Project Management Templates
 */
(function (global) {
  "use strict";

  var U = global.StudioUtils || {};

  var PHASES = [
    { id: 0, key: "planning", label: "التخطيط" },
    { id: 1, key: "preparation", label: "التحضير" },
    { id: 2, key: "execution", label: "التنفيذ" },
    { id: 3, key: "review", label: "المراجعة" },
    { id: 4, key: "completion", label: "الإنجاز" }
  ];

  var DEFAULT_CATEGORIES = [
    { id: "task", label: "مهام عامة", color: "#475569", colorClass: "tag-task", isDefault: true },
    { id: "appt", label: "اجتماعات ومواعيد", color: "#2563eb", colorClass: "tag-appt", isDefault: true },
    { id: "research", label: "بحث وتخطيط", color: "#0284c7", colorClass: "tag-research", isDefault: true },
    { id: "development", label: "تطوير وإنشاء", color: "#7c3aed", colorClass: "tag-development", isDefault: true },
    { id: "finance", label: "مالية ومشتريات", color: "#16a34a", colorClass: "tag-finance", isDefault: true },
    { id: "approval", label: "مراجعة وموافقات", color: "#d97706", colorClass: "tag-approval", isDefault: true },
    { id: "contact", label: "تواصل ومتابعة", color: "#0d9488", colorClass: "tag-contact", isDefault: true },
    { id: "delivery", label: "تسليم وإنجاز", color: "#b45309", colorClass: "tag-delivery", isDefault: true }
  ];

  var CATEGORY_COLORS = [
    { name: "أخضر هادئ", hex: "#1f6355" },
    { name: "أزرق ملكي", hex: "#2563eb" },
    { name: "سماوي", hex: "#0284c7" },
    { name: "زمردي", hex: "#16a34a" },
    { name: "كهرماني", hex: "#d97706" },
    { name: "نحاسي", hex: "#966a24" },
    { name: "بنفسجي", hex: "#7c3aed" },
    { name: "وردي", hex: "#e11d48" },
    { name: "مرجاني", hex: "#ea580c" },
    { name: "رمادي", hex: "#475569" }
  ];

  var KINDS = {
    all: { label: "الكل", colorClass: "", color: "#475569" },
    task: { label: "مهام عامة", colorClass: "tag-task", color: "#475569" },
    appt: { label: "اجتماعات ومواعيد", colorClass: "tag-appt", color: "#2563eb" },
    research: { label: "بحث وتخطيط", colorClass: "tag-research", color: "#0284c7" },
    development: { label: "تطوير وإنشاء", colorClass: "tag-development", color: "#7c3aed" },
    finance: { label: "مالية ومشتريات", colorClass: "tag-finance", color: "#16a34a" },
    approval: { label: "مراجعة وموافقات", colorClass: "tag-approval", color: "#d97706" },
    contact: { label: "تواصل ومتابعة", colorClass: "tag-contact", color: "#0d9488" },
    delivery: { label: "تسليم وإنجاز", colorClass: "tag-delivery", color: "#b45309" }
  };

  var PROJECT_TASK_TEMPLATES = [
    ["research", "جمع المعلومات وتحديد المتطلبات", 0.08],
    ["task", "إعداد خطة العمل والجدول الزمني", 0.20],
    ["appt", "عقد اجتماع لمراجعة خطة المشروع", 0.32],
    ["development", "البدء بتنفيذ المهام الأساسية", 0.48],
    ["finance", "مراجعة التكاليف والموارد", 0.62],
    ["approval", "مراجعة النتائج واعتماد العمل", 0.78],
    ["contact", "متابعة التقدم والتحديثات", 0.88],
    ["delivery", "إتمام المشروع وتسليم النتائج", 1.0]
  ];

  function getInitialSeedData() {
    var generateId = U.generateId || function () {
      return Math.random().toString(36).slice(2, 9);
    };

    var getTodayIso = U.getTodayIso || function () {
      return new Date().toISOString().slice(0, 10);
    };

    var addDaysIso = U.addDaysIso || function (n) {
      var d = new Date();
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    return {
      version: 3,
      theme: "auto",
      clients: [],

      projects: [],
      items: [],

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
