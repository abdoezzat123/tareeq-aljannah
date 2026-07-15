// نظام المزامنة بين localStorage وقاعدة البيانات

import { getSettings, saveSettings } from "@/lib/storage";

export interface SyncUser {
  userId: string;
  email: string;
  name?: string | null;
}

export async function fetchCurrentUser(): Promise<SyncUser | null> {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function syncBookmarksUp(): Promise<void> {
  try {
    const saved: string[] = JSON.parse(localStorage.getItem("tareeq-islam_ayah-bookmarks") || "[]");
    if (saved.length === 0) return;
    const bookmarks = saved.map((key) => {
      const [surahNumber, ayahNumber] = key.split("-").map(Number);
      return { surahNumber, ayahNumber, surahName: "" };
    });
    await fetch("/api/sync/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", bookmarks }),
    });
  } catch {}
}

export async function syncBookmarksDown(): Promise<void> {
  try {
    const res = await fetch("/api/sync/bookmarks");
    const data = await res.json();
    if (data.bookmarks) {
      const keys = data.bookmarks.map((b: { surahNumber: number; ayahNumber: number }) => `${b.surahNumber}-${b.ayahNumber}`);
      localStorage.setItem("tareeq-islam_ayah-bookmarks", JSON.stringify(keys));
    }
  } catch {}
}

export async function toggleBookmarkAPI(surahNumber: number, ayahNumber: number, surahName: string, add: boolean): Promise<void> {
  try {
    await fetch("/api/sync/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: add ? "add" : "remove", surahNumber, ayahNumber, surahName }),
    });
  } catch {}
}

export async function syncPrayerAPI(date: string, prayer: string, prayed: boolean): Promise<void> {
  try {
    await fetch("/api/sync/prayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, prayer, prayed }),
    });
  } catch {}
}

export async function syncTasbihAPI(date: string, counts: Record<string, number>, total: number): Promise<void> {
  try {
    await fetch("/api/sync/tasbih", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, counts, total }),
    });
  } catch {}
}

export async function syncReadingAPI(surahNumber: number, surahName: string, ayahNumber: number, ayahIndex: number): Promise<void> {
  try {
    await fetch("/api/sync/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surahNumber, surahName, ayahNumber, ayahIndex }),
    });
  } catch {}
}

export async function fetchReadingPosition(): Promise<{ surahNumber: number; surahName: string; ayahNumber: number; ayahIndex: number } | null> {
  try {
    const res = await fetch("/api/sync/reading");
    const data = await res.json();
    return data.position;
  } catch {
    return null;
  }
}

export async function fetchTasbihLogs(): Promise<{ date: string; counts: string; total: number }[]> {
  try {
    const res = await fetch("/api/sync/tasbih");
    const data = await res.json();
    return data.logs || [];
  } catch {
    return [];
  }
}

export async function fetchPrayerLogs(): Promise<{ date: string; fajr: boolean; sunrise: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }[]> {
  try {
    const res = await fetch("/api/sync/prayer");
    const data = await res.json();
    return data.logs || [];
  } catch {
    return [];
  }
}

export async function syncSettingsUp(): Promise<void> {
  try {
    const settings = getSettings();
    await fetch("/api/sync/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "settings", value: settings }),
    });
  } catch {}
}

export async function syncSettingsDown(): Promise<void> {
  try {
    const res = await fetch("/api/sync/settings");
    const data = await res.json();
    if (data.settings?.settings) {
      const serverSettings = JSON.parse(data.settings.settings);
      saveSettings(serverSettings);
    }
  } catch {}
}

export async function fullSyncDown(): Promise<void> {
  await Promise.all([syncBookmarksDown(), syncSettingsDown()]);

  const tasbihLogs = await fetchTasbihLogs();
  if (tasbihLogs.length > 0) {
    const history = tasbihLogs.map((log) => ({
      date: log.date,
      counts: JSON.parse(log.counts),
      total: log.total,
    }));
    localStorage.setItem("tareeq-islam_tasbih_history", JSON.stringify(history));
  }

  const position = await fetchReadingPosition();
  if (position) {
    localStorage.setItem("tareeq-islam_reading-position", JSON.stringify({ ...position, timestamp: Date.now() }));
  }

  const prayerLogs = await fetchPrayerLogs();
  prayerLogs.forEach((log) => {
    localStorage.setItem(`tareeq-islam_prayer-tracking_${log.date}`, JSON.stringify({
      Fajr: log.fajr, Sunrise: log.sunrise, Dhuhr: log.dhuhr,
      Asr: log.asr, Maghrib: log.maghrib, Isha: log.isha,
    }));
  });
}

export async function fullSyncUp(): Promise<void> {
  await Promise.all([syncBookmarksUp(), syncSettingsUp()]);

  const history = JSON.parse(localStorage.getItem("tareeq-islam_tasbih_history") || "[]");
  for (const record of history) {
    await syncTasbihAPI(record.date, record.counts, record.total);
  }

  const position = localStorage.getItem("tareeq-islam_reading-position");
  if (position) {
    const pos = JSON.parse(position);
    await syncReadingAPI(pos.surahNumber, pos.surahName, pos.ayahNumber, pos.ayahIndex);
  }

  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const prayerTracking = localStorage.getItem(`tareeq-islam_prayer-tracking_${dateKey}`);
  if (prayerTracking) {
    const tracking = JSON.parse(prayerTracking);
    for (const [prayer, prayed] of Object.entries(tracking)) {
      await syncPrayerAPI(dateKey, prayer, prayed as boolean);
    }
  }
}
