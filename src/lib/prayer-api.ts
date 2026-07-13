// دوال مساعدة للاتصال بـ APIs الخارجية

// قائمة المدن العربية الكبرى للاختيار اليدوي
export const cities = [
  { name: "مكة المكرمة", country: "السعودية", lat: 21.4225, lng: 39.8262 },
  { name: "المدينة المنورة", country: "السعودية", lat: 24.4709, lng: 39.6121 },
  { name: "الرياض", country: "السعودية", lat: 24.7136, lng: 46.6753 },
  { name: "جدة", country: "السعودية", lat: 21.5433, lng: 39.1728 },
  { name: "القاهرة", country: "مصر", lat: 30.0444, lng: 31.2357 },
  { name: "الإسكندرية", country: "مصر", lat: 31.2001, lng: 29.9187 },
  { name: "الجيزة", country: "مصر", lat: 30.0131, lng: 31.2089 },
  { name: "أسيوط", country: "مصر", lat: 27.1809, lng: 31.1837 },
  { name: "أسوان", country: "مصر", lat: 24.0889, lng: 32.8998 },
  { name: "طنطا", country: "مصر", lat: 30.7865, lng: 31.0004 },
  { name: "المنصورة", country: "مصر", lat: 31.0409, lng: 31.3785 },
  { name: "بورسعيد", country: "مصر", lat: 31.2653, lng: 32.3019 },
  { name: "السويس", country: "مصر", lat: 29.9737, lng: 32.5263 },
  { name: "الأقصر", country: "مصر", lat: 25.6872, lng: 32.6396 },
  { name: "دمشق", country: "سوريا", lat: 33.5138, lng: 36.2765 },
  { name: "حلب", country: "سوريا", lat: 36.2021, lng: 37.1343 },
  { name: "بغداد", country: "العراق", lat: 33.3152, lng: 44.3661 },
  { name: "البصرة", country: "العراق", lat: 30.5085, lng: 47.7804 },
  { name: "بيروت", country: "لبنان", lat: 33.8938, lng: 35.5018 },
  { name: "عمان", country: "الأردن", lat: 31.9454, lng: 35.9284 },
  { name: "القدس", country: "فلسطين", lat: 31.7683, lng: 35.2137 },
  { name: "غزة", country: "فلسطين", lat: 31.5017, lng: 34.4668 },
  { name: "صنعاء", country: "اليمن", lat: 15.3694, lng: 44.1910 },
  { name: "الدوحة", country: "قطر", lat: 25.2854, lng: 51.5310 },
  { name: "أبو ظبي", country: "الإمارات", lat: 24.4539, lng: 54.3773 },
  { name: "دبي", country: "الإمارات", lat: 25.2048, lng: 55.2708 },
  { name: "الريان", country: "قطر", lat: 25.3236, lng: 51.4220 },
  { name: "الكويت", country: "الكويت", lat: 29.3759, lng: 47.9774 },
  { name: "المنامة", country: "البحرين", lat: 26.2285, lng: 50.5860 },
  { name: "مسقط", country: "عُمان", lat: 23.5880, lng: 58.3829 },
  { name: "الجزائر", country: "الجزائر", lat: 36.7538, lng: 3.0588 },
  { name: "تونس", country: "تونس", lat: 36.8065, lng: 10.1815 },
  { name: "طرابلس", country: "ليبيا", lat: 32.8872, lng: 13.1913 },
  { name: "الرباط", country: "المغرب", lat: 34.0209, lng: -6.8416 },
  { name: "الدار البيضاء", country: "المغرب", lat: 33.5731, lng: -7.5898 },
  { name: "الخرطوم", country: "السودان", lat: 15.5007, lng: 32.5599 },
  { name: "مقديشو", country: "الصومال", lat: 2.0469, lng: 45.3182 },
  { name: "نواكشوط", country: "موريتانيا", lat: 18.0858, lng: -15.9785 },
  { name: "جيبوتي", country: "جيبوتي", lat: 11.8251, lng: 42.5903 },
  { name: "إسطنبول", country: "تركيا", lat: 41.0082, lng: 28.9784 },
  { name: "أنقرة", country: "تركيا", lat: 39.9334, lng: 32.8597 },
];

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export interface PrayerData {
  timings: PrayerTimes;
  date: {
    readable: string;
    timestamp: string;
    hijri: {
      date: string;
      day: string;
      month: { ar: string; en: string; number: number };
      year: string;
      weekday: { ar: string; en: string };
    };
    gregorian: {
      date: string;
      weekday: { ar: string; en: string };
    };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
    };
  };
}

// جلب مواقيت الصلاة من Aladhan API
export async function fetchPrayerTimes(
  lat: number,
  lng: number,
  method: number = 5 // 5 = Egyptian General Authority of Survey
): Promise<PrayerData> {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${method}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("فشل في جلب مواقيت الصلاة");
  }
  const data = await response.json();
  return data.data;
}

// تنسيق الوقت 12 ساعة بالعربية
export function formatTime12(time24: string): string {
  if (!time24) return "";
  // الوقت يأتي بصيغة "05:23 (EET)" أو "05:23"
  const cleanTime = time24.split(" ")[0];
  const [h, m] = cleanTime.split(":").map(Number);
  const period = h >= 12 ? "م" : "ص";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// الحصول على الصلاة القادمة
export function getNextPrayer(timings: PrayerTimes): { name: string; time: string; remaining: string } | null {
  const now = new Date();
  const prayers = [
    { name: "الفجر", time: timings.Fajr },
    { name: "الشروق", time: timings.Sunrise },
    { name: "الظهر", time: timings.Dhuhr },
    { name: "العصر", time: timings.Asr },
    { name: "المغرب", time: timings.Maghrib },
    { name: "العشاء", time: timings.Isha },
  ];

  for (const prayer of prayers) {
    const [h, m] = prayer.time.split(" ")[0].split(":").map(Number);
    const prayerTime = new Date();
    prayerTime.setHours(h, m, 0, 0);

    if (prayerTime > now) {
      const diff = prayerTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return {
        name: prayer.name,
        time: prayer.time,
        remaining: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      };
    }
  }

  // إذا انتهت كل صلوات اليوم، الفجر القادم
  return {
    name: "الفجر",
    time: timings.Fajr,
    remaining: "غداً",
  };
}
