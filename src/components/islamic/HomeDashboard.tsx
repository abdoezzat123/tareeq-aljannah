"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, MapPin, Sparkles, Beaker, BookOpen, Moon, TrendingUp, Bell, BellOff, Volume2 } from "lucide-react";
import { getSettings, getTodayTasbih, requestNotificationPermission, showNotification, playReminderSound } from "@/lib/storage";
import { hourlyAdhkar } from "@/lib/adhkar-data";
import { fetchPrayerTimes, formatTime12, getNextPrayer, PrayerData } from "@/lib/prayer-api";
import { TabId } from "./Navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HomeProps {
  onNavigate: (tab: TabId) => void;
}

// Initial state from settings (no setState in effect)
const getInitialSettings = () => {
  if (typeof window === "undefined") {
    return { hourlyReminder: true, adhkarReminder: true, notificationsEnabled: false };
  }
  const settings = getSettings();
  return {
    hourlyReminder: settings.hourlyReminder,
    adhkarReminder: settings.adhkarReminder,
    notificationsEnabled: "Notification" in window && Notification.permission === "granted",
  };
};

export function HomeDashboard({ onNavigate }: HomeProps) {
  const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, name: "", time: "" });
  const [locationName, setLocationName] = useState("");
  const [initialSettings] = useState(getInitialSettings);
  const [hourlyReminder, setHourlyReminder] = useState(initialSettings.hourlyReminder);
  const [adhkarReminder, setAdhkarReminder] = useState(initialSettings.adhkarReminder);
  const [notificationsEnabled, setNotificationsEnabled] = useState(initialSettings.notificationsEnabled);
  const lastHourNotifiedRef = useRef(-1);
  const locationLoadedRef = useRef(false);

  const todayTasbih = getTodayTasbih();
  const todayTotal = todayTasbih?.total || 0;

  // تحميل المواقيت (مرة واحدة)
  useEffect(() => {
    if (locationLoadedRef.current) return;
    locationLoadedRef.current = true;

    const settings = getSettings();
    if (settings.location) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocationName(`${settings.location.name}${settings.location.country ? "، " + settings.location.country : ""}`);
      fetchPrayerTimes(settings.location.lat, settings.location.lng)
        .then((data) => setPrayerData(data))
        .catch(() => {});
    } else {
      // محاولة الحصول على الموقع تلقائياً
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const data = await fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude);
              setPrayerData(data);
              setLocationName("موقعك الحالي");
            } catch {}
          },
          () => {},
          { timeout: 10000 }
        );
      }
    }
  }, []);

  // العد التنازلي للصلاة
  useEffect(() => {
    if (!prayerData) return;
    const interval = setInterval(() => {
      const next = getNextPrayer(prayerData.timings);
      if (next) {
        const [h, m, s] = next.remaining.split(":").map(Number);
        setCountdown({ hours: h, minutes: m, seconds: s, name: next.name, time: next.time });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [prayerData]);

  // تذكير كل ساعة
  useEffect(() => {
    if (!hourlyReminder) return;
    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // كل بداية ساعة (الدقيقة 0)
      if (currentMinute === 0 && currentHour !== lastHourNotifiedRef.current) {
        lastHourNotifiedRef.current = currentHour;
        const dhikr = hourlyAdhkar[currentHour % hourlyAdhkar.length];

        if (notificationsEnabled) {
          showNotification("🕯️ تذكير بذكر الله", `${dhikr.text}\n\nالساعة ${currentHour}:00`);
        }

        if (adhkarReminder) {
          playReminderSound();
        }

        toast.info(`🕯️ تذكير بذكر الله - ${currentHour}:00`, {
          description: dhikr.text,
          duration: 10000,
        });
      }
    }, 60000); // تحقق كل دقيقة

    return () => clearInterval(interval);
  }, [hourlyReminder, notificationsEnabled, adhkarReminder]);

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      toast.info("تم إيقاف الإشعارات");
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        toast.success("تم تفعيل الإشعارات ✅");
        showNotification("أهلاً بك في طريقك للجنة", "ستصلك تذكيرات بذكر الله ومواقيت الصلاة");
      } else {
        toast.error("تعذّر تفعيل الإشعارات. اسمح بالإشعارات من إعدادات المتصفح");
      }
    }
  };

  const toggleHourlyReminder = () => {
    const newValue = !hourlyReminder;
    setHourlyReminder(newValue);
    const settings = getSettings();
    saveSettings({ ...settings, hourlyReminder: newValue });
    toast.info(newValue ? "تم تفعيل تذكير كل ساعة" : "تم إيقاف تذكير كل ساعة");
  };

  const quickCards: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; tab: TabId; color: string }[] = [
    { title: "السبحة", subtitle: `${todayTotal} تسبيحة اليوم`, icon: Beaker, tab: "tasbih", color: "from-amber-500/20 to-yellow-500/10" },
    { title: "الأذكار", subtitle: "صباح ومساء", icon: Sparkles, tab: "adhkar", color: "from-emerald-500/20 to-teal-500/10" },
    { title: "القرآن", subtitle: "اقرأ واستمع", icon: BookOpen, tab: "quran", color: "from-purple-500/20 to-indigo-500/10" },
    { title: "التفسير", subtitle: "السعدي والميسر", icon: Moon, tab: "tafsir", color: "from-blue-500/20 to-cyan-500/10" },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      {/* ترحيب */}
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full glass-gold gold-glow mb-3">
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-gold" />
        </div>
        <h2 className="font-display text-3xl sm:text-5xl gold-gradient-text font-bold mb-2">
          طريقك للجنة
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {greetingByTime()}
        </p>
        {locationName && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" />
            {locationName}
          </p>
        )}
      </div>

      {/* بطاقة الصلاة القادمة */}
      {prayerData ? (
        <div className="glass-gold rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 islamic-pattern" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-gold" />
              <span className="text-sm text-muted-foreground">الصلاة القادمة</span>
            </div>
            <h3 className="font-display text-4xl sm:text-5xl gold-gradient-text font-bold mb-1">
              {countdown.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">{formatTime12(countdown.time)}</p>

            <div className="flex items-center justify-center gap-2 sm:gap-3" dir="ltr">
              <div className="glass rounded-xl p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]">
                <div className="text-2xl sm:text-3xl font-bold gold-gradient-text tabular-nums">
                  {String(countdown.hours).padStart(2, "0")}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">ساعة</div>
              </div>
              <div className="text-xl sm:text-2xl text-gold font-bold">:</div>
              <div className="glass rounded-xl p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]">
                <div className="text-2xl sm:text-3xl font-bold gold-gradient-text tabular-nums">
                  {String(countdown.minutes).padStart(2, "0")}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">دقيقة</div>
              </div>
              <div className="text-xl sm:text-2xl text-gold font-bold">:</div>
              <div className="glass rounded-xl p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]">
                <div className="text-2xl sm:text-3xl font-bold gold-gradient-text tabular-nums">
                  {String(countdown.seconds).padStart(2, "0")}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">ثانية</div>
              </div>
            </div>

            {/* مواقيت اليوم */}
            <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { name: "الفجر", time: prayerData.timings.Fajr },
                { name: "الشروق", time: prayerData.timings.Sunrise },
                { name: "الظهر", time: prayerData.timings.Dhuhr },
                { name: "العصر", time: prayerData.timings.Asr },
                { name: "المغرب", time: prayerData.timings.Maghrib },
                { name: "العشاء", time: prayerData.timings.Isha },
              ].map((p) => (
                <div key={p.name} className={cn(
                  "rounded-lg p-2",
                  countdown.name === p.name ? "glass-gold gold-glow" : "bg-secondary/30"
                )}>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{p.name}</div>
                  <div className={cn(
                    "text-xs sm:text-sm font-bold tabular-nums",
                    countdown.name === p.name ? "text-gold" : "text-foreground"
                  )} dir="ltr">
                    {formatTime12(p.time)}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate("prayer")}
              className="mt-4 text-xs text-gold hover:text-gold-light transition-colors"
            >
              عرض التفاصيل الكاملة ←
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onNavigate("prayer")}
          className="w-full glass rounded-2xl p-6 text-center hover:glass-gold transition-all"
        >
          <MapPin className="w-8 h-8 text-gold mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">اضغط لتحديد موقعك ومشاهدة مواقيت الصلاة</p>
        </button>
      )}

      {/* التذكير بالساعة */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass-gold flex items-center justify-center">
              <Bell className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">تذكير كل ساعة</h3>
              <p className="text-xs text-muted-foreground">تذكير بذكر الله في بداية كل ساعة</p>
            </div>
          </div>
          <button
            onClick={toggleHourlyReminder}
            className={cn(
              "w-12 h-6 rounded-full transition-all relative",
              hourlyReminder ? "bg-gold" : "bg-secondary"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
              hourlyReminder ? "right-0.5" : "right-6"
            )} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            صوت تذكير + إشعار
          </div>
          <button
            onClick={toggleNotifications}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              notificationsEnabled ? "glass-gold text-gold" : "glass text-muted-foreground"
            )}
          >
            {notificationsEnabled ? "✓ الإشعارات مفعّلة" : "تفعيل الإشعارات"}
          </button>
        </div>
      </div>

      {/* بطاقات سريعة */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {quickCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => onNavigate(card.tab)}
              className={cn(
                "rounded-2xl p-4 sm:p-5 text-right transition-all hover:scale-[1.02] active:scale-100",
                "bg-gradient-to-br border border-gold/10 hover:border-gold/30",
                card.color
              )}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl glass-gold flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
              </div>
              <h3 className="font-bold text-foreground text-base sm:text-lg mb-0.5">{card.title}</h3>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* إحصائيات اليوم */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-gold text-sm">إنجازات اليوم</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-xl bg-secondary/30">
            <div className="text-3xl font-bold gold-gradient-text tabular-nums">{todayTotal}</div>
            <div className="text-xs text-muted-foreground mt-1">تسبيحة</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-secondary/30">
            <div className="text-3xl font-bold gold-gradient-text tabular-nums">
              {Object.keys(todayTasbih?.counts || {}).length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">أنواع أذكار</div>
          </div>
        </div>

        {todayTotal === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            ابدأ يومك بذكر الله 🌟
          </p>
        )}
      </div>

      {/* آية اليوم */}
      <div className="glass-gold rounded-2xl p-6 text-center">
        <div className="text-xs text-gold mb-3">آية اليوم</div>
        <p className="font-amiri text-2xl sm:text-3xl leading-loose text-foreground mb-3">
          وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ
        </p>
        <p className="text-xs text-muted-foreground">سورة الطلاق - الآيتان 2-3</p>
      </div>
    </div>
  );
}

function greetingByTime(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "صباح الخير والبركة 🌅";
  if (hour >= 12 && hour < 17) return "نهارك سعيد ☀️";
  if (hour >= 17 && hour < 20) return "مساء النور 🌆";
  return "ليلة طيبة 🌙";
}
