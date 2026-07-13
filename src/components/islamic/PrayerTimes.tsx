"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Search, Navigation2, Loader2, Clock, Sunrise, Sun, Sunset, Moon } from "lucide-react";
import { cities, fetchPrayerTimes, formatTime12, getNextPrayer, PrayerData } from "@/lib/prayer-api";
import { getSettings, saveSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function PrayerTimes() {
  const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, name: "", time: "" });

  const loadPrayerTimes = useCallback(async (location?: { lat: number; lng: number; name: string; country: string }) => {
    setLoading(true);
    setError(null);
    try {
      const settings = getSettings();
      const loc = location || settings.location;

      if (!loc) {
        // محاولة الحصول على الموقع تلقائياً
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const data = await fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude);
                setPrayerData(data);
                setLocationName("موقعك الحالي");
                saveSettings({
                  location: {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    name: "موقعي الحالي",
                    country: "",
                  },
                });
                setLoading(false);
                toast.success("تم تحديد موقعك تلقائياً");
              } catch {
                setError("فشل في جلب المواقيت. اختر مدينتك يدوياً");
                setLoading(false);
              }
            },
            () => {
              setError("تعذّر تحديد موقعك. اختر مدينتك يدوياً");
              setLoading(false);
            },
            { timeout: 10000 }
          );
        } else {
          setError("المتصفح لا يدعم تحديد الموقع. اختر مدينتك يدوياً");
          setLoading(false);
        }
        return;
      }

      setLocationName(`${loc.name}${loc.country ? "، " + loc.country : ""}`);
      const data = await fetchPrayerTimes(loc.lat, loc.lng);
      setPrayerData(data);
      setLoading(false);
    } catch {
      setError("حدث خطأ. حاول مرة أخرى");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  // تحديث العد التنازلي كل ثانية
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

  const selectCity = async (city: typeof cities[0]) => {
    setDialogOpen(false);
    const location = { lat: city.lat, lng: city.lng, name: city.name, country: city.country };
    saveSettings({ location });
    await loadPrayerTimes(location);
    toast.success(`تم تحديد الموقع: ${city.name}`);
  };

  const useMyLocation = () => {
    setDialogOpen(false);
    saveSettings({ location: null });
    setLocationName("");
    loadPrayerTimes();
  };

  const filteredCities = cities.filter(
    (c) =>
      c.name.includes(searchQuery) ||
      c.country.includes(searchQuery) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-gold mx-auto mb-4" />
          <p className="text-muted-foreground">جارٍ جلب مواقيت الصلاة...</p>
        </div>
      </div>
    );
  }

  const prayers = prayerData
    ? [
        { name: "الفجر", time: prayerData.timings.Fajr, icon: Sunrise, color: "from-purple-500/20 to-indigo-500/10" },
        { name: "الشروق", time: prayerData.timings.Sunrise, icon: Sun, color: "from-orange-500/20 to-yellow-500/10" },
        { name: "الظهر", time: prayerData.timings.Dhuhr, icon: Sun, color: "from-yellow-500/20 to-orange-500/10" },
        { name: "العصر", time: prayerData.timings.Asr, icon: Sun, color: "from-amber-500/20 to-yellow-500/10" },
        { name: "المغرب", time: prayerData.timings.Maghrib, icon: Sunset, color: "from-orange-600/20 to-red-500/10" },
        { name: "العشاء", time: prayerData.timings.Isha, icon: Moon, color: "from-indigo-600/20 to-blue-800/10" },
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      <div className="text-center">
        <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">
          مواقيت الصلاة
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا
        </p>
      </div>

      {/* اختيار الموقع */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button className="w-full glass-gold rounded-2xl p-4 flex items-center justify-between hover:gold-glow transition-all">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gold" />
              <div className="text-right">
                <div className="text-xs text-muted-foreground">الموقع الحالي</div>
                <div className="font-bold text-gold">{locationName || "اختر مدينتك"}</div>
              </div>
            </div>
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>
        </DialogTrigger>
        <DialogContent className="glass border-gold/30 max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="gold-gradient-text font-display text-xl">اختر مدينتك</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <button
              onClick={useMyLocation}
              className="w-full glass-gold rounded-xl p-3 flex items-center justify-center gap-2 text-gold hover:gold-glow transition-all"
            >
              <Navigation2 className="w-4 h-4" />
              تحديد موقعي تلقائياً
            </button>

            <div className="text-xs text-muted-foreground text-center">أو ابحث عن مدينتك:</div>

            <Input
              placeholder="ابحث عن مدينة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-secondary/30 border-gold/20"
            />

            <div className="max-h-72 overflow-y-auto custom-scroll space-y-1">
              {filteredCities.map((city) => (
                <button
                  key={`${city.name}-${city.country}`}
                  onClick={() => selectCity(city)}
                  className="w-full text-right p-3 rounded-lg hover:bg-gold/10 transition-all flex items-center justify-between"
                >
                  <span className="font-medium">{city.name}</span>
                  <span className="text-xs text-muted-foreground">{city.country}</span>
                </button>
              ))}
              {filteredCities.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">لا توجد نتائج</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="glass-gold rounded-2xl p-4 text-center">
          <p className="text-sm text-gold mb-3">{error}</p>
          <button
            onClick={() => setDialogOpen(true)}
            className="px-4 py-2 rounded-lg glass-gold text-gold text-sm"
          >
            اختر مدينتك
          </button>
        </div>
      )}

      {prayerData && (
        <>
          {/* العد التنازلي للصلاة القادمة */}
          <div className="glass-gold rounded-3xl p-6 sm:p-8 text-center gold-glow relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 islamic-pattern" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gold" />
                <span className="text-sm text-muted-foreground">الصلاة القادمة</span>
              </div>
              <h3 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-1">
                {countdown.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {formatTime12(countdown.time)}
              </p>

              <div className="flex items-center justify-center gap-2 sm:gap-4" dir="ltr">
                <div className="glass rounded-xl p-3 sm:p-4 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-3xl sm:text-4xl font-bold gold-gradient-text tabular-nums">
                    {String(countdown.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">ساعة</div>
                </div>
                <div className="text-2xl sm:text-3xl text-gold font-bold">:</div>
                <div className="glass rounded-xl p-3 sm:p-4 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-3xl sm:text-4xl font-bold gold-gradient-text tabular-nums">
                    {String(countdown.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">دقيقة</div>
                </div>
                <div className="text-2xl sm:text-3xl text-gold font-bold">:</div>
                <div className="glass rounded-xl p-3 sm:p-4 min-w-[70px] sm:min-w-[90px]">
                  <div className="text-3xl sm:text-4xl font-bold gold-gradient-text tabular-nums">
                    {String(countdown.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">ثانية</div>
                </div>
              </div>
            </div>
          </div>

          {/* التاريخ الهجري */}
          <div className="glass rounded-2xl p-5 text-center">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">التاريخ الميلادي</div>
                <div className="font-bold text-foreground">
                  {prayerData.date.gregorian.date} - {prayerData.date.gregorian.weekday.ar}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">التاريخ الهجري</div>
                <div className="font-bold text-gold">
                  {prayerData.date.hijri.day} {prayerData.date.hijri.month.ar} {prayerData.date.hijri.year} هـ
                </div>
                <div className="text-xs text-muted-foreground">{prayerData.date.hijri.weekday.ar}</div>
              </div>
            </div>
          </div>

          {/* مواقيت الصلوات */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {prayers.map((prayer) => {
              const Icon = prayer.icon;
              const isNext = countdown.name === prayer.name;
              return (
                <div
                  key={prayer.name}
                  className={cn(
                    "rounded-2xl p-4 transition-all border",
                    isNext
                      ? "glass-gold border-gold/40 gold-glow"
                      : "glass border-gold/10"
                  )}
                >
                  <div className={cn(
                    "rounded-xl p-3 mb-3 bg-gradient-to-br inline-flex",
                    prayer.color
                  )}>
                    <Icon className={cn("w-6 h-6", isNext ? "text-gold" : "text-muted-foreground")} />
                  </div>
                  <div className="text-sm font-bold text-foreground mb-1">{prayer.name}</div>
                  <div className={cn(
                    "text-lg sm:text-xl font-bold tabular-nums",
                    isNext ? "text-gold" : "text-foreground/80"
                  )} dir="ltr">
                    {formatTime12(prayer.time)}
                  </div>
                  {isNext && (
                    <div className="text-[10px] text-gold mt-1 animate-pulse">● القادمة</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
