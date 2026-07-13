// نظام تخزين محلي للإعدادات والتتبع اليومي

const STORAGE_PREFIX = "tareeq-islam_";

export function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

export function removeItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {}
}

// مدير تتبع التسبيح اليومي
export interface TasbihRecord {
  date: string; // YYYY-MM-DD
  counts: Record<string, number>; // { subhan_allah: 33, alhamdulillah: 100, ... }
  total: number;
}

export function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function getTasbihHistory(): TasbihRecord[] {
  return getItem<TasbihRecord[]>("tasbih_history", []);
}

export function saveTasbihCount(tasbihId: string, count: number): void {
  const history = getTasbihHistory();
  const todayKey = getTodayKey();
  let todayRecord = history.find((r) => r.date === todayKey);

  if (!todayRecord) {
    todayRecord = { date: todayKey, counts: {}, total: 0 };
    history.push(todayRecord);
  }

  todayRecord.counts[tasbihId] = count;
  todayRecord.total = Object.values(todayRecord.counts).reduce((s, n) => s + n, 0);

  // الاحتفاظ بآخر 30 يوم فقط
  const recent = history.slice(-30);
  setItem("tasbih_history", recent);
}

export function getTodayTasbih(): TasbihRecord | null {
  const history = getTasbihHistory();
  const todayKey = getTodayKey();
  return history.find((r) => r.date === todayKey) || null;
}

// إعدادات المستخدم
export interface UserSettings {
  location: { lat: number; lng: number; name: string; country: string } | null;
  qari: string;
  tafsir: string;
  hourlyReminder: boolean;
  adhkarReminder: boolean;
  dailyGoal: number;
  lastReadSurah?: number;
  lastReadAyah?: number;
}

export function getSettings(): UserSettings {
  return getItem<UserSettings>("settings", {
    location: null,
    qari: "ar.alafasy",
    tafsir: "saadi",
    hourlyReminder: true,
    adhkarReminder: true,
    dailyGoal: 1000,
  });
}

export function saveSettings(settings: Partial<UserSettings>): void {
  const current = getSettings();
  setItem("settings", { ...current, ...settings });
}

// إشعارات المتصفح
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function showNotification(title: string, body: string, icon?: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: icon || "/icon-192.png",
        badge: icon || "/icon-192.png",
        tag: "islamic-reminder",
        dir: "rtl",
        lang: "ar",
      });
    } catch {}
  }
}

// تشغيل صوت تذكير قصير باستخدام Web Audio API
export function playReminderSound(): void {
  if (typeof window === "undefined") return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = audioContext.currentTime;

    // نغمتين قصيرتين
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    playTone(523.25, now, 0.3); // C5
    playTone(659.25, now + 0.35, 0.3); // E5
    playTone(783.99, now + 0.7, 0.5); // G5

    setTimeout(() => audioContext.close(), 2000);
  } catch {}
}
