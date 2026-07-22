// سنن بعد الصلوات المفروضة

export interface Sunnah {
  id: number;
  text: string;
  count: number;
  reference?: string;
  virtue?: string;
}

export const afterPrayerSunnahs: Sunnah[] = [
  {
    id: 1,
    text: "ركعتان قبل صلاة الفجر",
    count: 2,
    reference: "متفق عليه",
    virtue: "أحب الصلاة إلى الله بعد الفريضة",
  },
  {
    id: 2,
    text: "أربع ركعات قبل صلاة الظهر",
    count: 4,
    reference: "رواه الترمذي",
    virtue: "بيته يدخل النار لا تطلع عليه الشمس",
  },
  {
    id: 3,
    text: "ركعتان بعد صلاة الظهر",
    count: 2,
    reference: "متفق عليه",
    virtue: "من حافظ عليها كُتبت له براءة من النار",
  },
  {
    id: 4,
    text: "ركعتان بعد صلاة المغرب",
    count: 2,
    reference: "متفق عليه",
    virtue: "من حافظ عليها كُتبت له براءة من النار",
  },
  {
    id: 5,
    text: "ركعتان بعد صلاة العشاء",
    count: 2,
    reference: "متفق عليه",
    virtue: "من حافظ عليها كُتبت له براءة من النار",
  },
  {
    id: 6,
    text: "أربع ركعات قبل صلاة العصر",
    count: 4,
    reference: "رواه الترمذي",
    virtue: "رحم الله امرءاً صلى قبل العصر أربعاً",
  },
  {
    id: 7,
    text: "ركعتان بعد الوتر (إذا أوترت آخر الليل)",
    count: 2,
    reference: "رواه مسلم",
    virtue: "سنة الوتر",
  },
];

// السنن المؤكدة اليومية
export const dailySunnahs: Sunnah[] = [
  {
    id: 1,
    text: "صلاة الضحى (ركعتان أو أربع أو أكثر)",
    count: 2,
    reference: "رواه مسلم",
    virtue: "تعدل صدقة على كل مفصل من جسدك",
  },
  {
    id: 2,
    text: "صلاة الوتر (إذا لم تصلها بالليل)",
    count: 1,
    reference: "رواه أبو داود",
    virtue: "أوصاني خليلي بثلاث: صيام ثلاثة أيام من كل شهر، وركعتي الضحى، وأن أوتر قبل أن أنام",
  },
  {
    id: 3,
    text: "ركعتان تحية المسجد عند دخوله",
    count: 2,
    reference: "متفق عليه",
    virtue: "إذا دخل أحدكم المسجد فلا يجلس حتى يصلي ركعتين",
  },
  {
    id: 4,
    text: "صلاة الاستخارة (عند الحاجة)",
    count: 2,
    reference: "رواه البخاري",
    virtue: "إذا هم أحدكم بالأمر فليركع ركعتين من غير الفريضة",
  },
  {
    id: 5,
    text: "صلاة الحاجة (عند الحاجة)",
    count: 2,
    reference: "رواه الترمذي",
    virtue: "من كانت له إلى الله حاجة فليتوضأ فليحسن الوضوء",
  },
  {
    id: 6,
    text: "صلاة التوبة (عند الذنب)",
    count: 2,
    reference: "رواه الترمذي",
    virtue: "ما من عبد يذنب ذنباً فيتوضأ فيحسن الوضوء ثم يصلي ركعتين",
  },
];

// قائمة الصلوات الخمس
export const obligatoryPrayers = [
  { id: "fajr", name: "الفجر", count: 2, time: "قبل الشروق" },
  { id: "dhuhr", name: "الظهر", count: 4, time: "بعد الزوال" },
  { id: "asr", name: "العصر", count: 4, time: "بعد الظهر" },
  { id: "maghrib", name: "المغرب", count: 3, time: "بعد الغروب" },
  { id: "isha", name: "العشاء", count: 4, time: "بعد المغرب" },
];
